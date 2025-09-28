/**
 * Transport.ts - 游戏传输层管理模块
 * 
 * 该文件负责管理客户端与服务器之间的通信，包括：
 * - WebSocket连接管理和消息传输
 * - 本地服务器连接（单人游戏和回放模式）
 * - 游戏事件的发送和处理
 * - 网络连接状态管理和重连机制
 * - 各种游戏意图（攻击、联盟、建造等）的传输
 * 
 * 主要组件：
 * - Transport类：核心传输管理器
 * - 各种GameEvent类：定义不同类型的游戏事件
 * - 连接管理：处理WebSocket和本地服务器连接
 * - 消息处理：序列化和反序列化游戏消息
 */

import { z } from "zod";
import { EventBus, GameEvent } from "../core/EventBus";
import {
  AllPlayers,
  GameType,
  Gold,
  PlayerID,
  Tick,
  UnitType,
} from "../core/game/Game";
import { TileRef } from "../core/game/GameMap";
import { PlayerView } from "../core/game/GameView";
import {
  AllPlayersStats,
  ClientHashMessage,
  ClientIntentMessage,
  ClientJoinMessage,
  ClientMessage,
  ClientPingMessage,
  ClientSendWinnerMessage,
  Intent,
  ServerMessage,
  ServerMessageSchema,
  Winner,
} from "../core/Schemas";
import { replacer } from "../core/Util";
import { LobbyConfig } from "./ClientGameRunner";
import { LocalServer } from "./LocalServer";

/**
 * 暂停游戏事件
 * 用于控制游戏的暂停和恢复状态
 */
export class PauseGameEvent implements GameEvent {
  constructor(public readonly paused: boolean) {}
}

/**
 * 发送联盟请求意图事件
 * 当玩家向其他玩家发送联盟请求时触发
 */
export class SendAllianceRequestIntentEvent implements GameEvent {
  constructor(
    public readonly requestor: PlayerView, // 发起联盟请求的玩家
    public readonly recipient: PlayerView, // 接收联盟请求的玩家
  ) {}
}

/**
 * 发送解除联盟意图事件
 * 当玩家要求解除与其他玩家的联盟关系时触发
 */
export class SendBreakAllianceIntentEvent implements GameEvent {
  constructor(
    public readonly requestor: PlayerView, // 发起解除联盟的玩家
    public readonly recipient: PlayerView, // 被解除联盟的玩家
  ) {}
}

/**
 * 发送升级建筑意图事件
 * 当玩家要升级某个建筑单位时触发
 */
export class SendUpgradeStructureIntentEvent implements GameEvent {
  constructor(
    public readonly unitId: number,    // 要升级的单位ID
    public readonly unitType: UnitType, // 要升级到的单位类型
  ) {}
}

/**
 * 发送联盟回复意图事件
 * 当玩家回复联盟请求（接受或拒绝）时触发
 */
export class SendAllianceReplyIntentEvent implements GameEvent {
  constructor(
    // The original alliance requestor
    public readonly requestor: PlayerView, // 原始联盟请求发起者
    public readonly recipient: PlayerView, // 回复联盟请求的玩家
    public readonly accepted: boolean,     // 是否接受联盟请求
  ) {}
}

/**
 * 发送联盟延期意图事件
 * 当玩家要求延长联盟关系时触发
 */
export class SendAllianceExtensionIntentEvent implements GameEvent {
  constructor(public readonly recipient: PlayerView) {} // 联盟延期的目标玩家
}

/**
 * 发送生成单位意图事件
 * 当玩家在指定位置生成新单位时触发
 */
export class SendSpawnIntentEvent implements GameEvent {
  constructor(public readonly tile: TileRef) {} // 生成单位的地图位置
}

/**
 * 发送攻击意图事件
 * 当玩家发起地面攻击时触发
 */
export class SendAttackIntentEvent implements GameEvent {
  constructor(
    public readonly targetID: PlayerID | null, // 攻击目标玩家ID，null表示攻击中立区域
    public readonly troops: number,            // 攻击使用的兵力数量
  ) {}
}

/**
 * 发送船只攻击意图事件
 * 当玩家使用船只进行海上攻击时触发
 */
export class SendBoatAttackIntentEvent implements GameEvent {
  constructor(
    public readonly targetID: PlayerID | null, // 攻击目标玩家ID
    public readonly dst: TileRef,              // 攻击目标位置
    public readonly troops: number,            // 攻击使用的兵力数量
    public readonly src: TileRef | null = null, // 攻击发起位置，null表示自动选择
  ) {}
}

/**
 * 建造单位意图事件
 * 当玩家在指定位置建造新建筑时触发
 */
export class BuildUnitIntentEvent implements GameEvent {
  constructor(
    public readonly unit: UnitType, // 要建造的单位类型
    public readonly tile: TileRef,  // 建造位置
  ) {}
}

/**
 * 发送目标玩家意图事件
 * 当玩家设置攻击目标玩家时触发
 */
export class SendTargetPlayerIntentEvent implements GameEvent {
  constructor(public readonly targetID: PlayerID) {} // 目标玩家ID
}

/**
 * 发送表情意图事件
 * 当玩家向其他玩家发送表情时触发
 */
export class SendEmojiIntentEvent implements GameEvent {
  constructor(
    public readonly recipient: PlayerView | typeof AllPlayers, // 表情接收者，可以是特定玩家或所有玩家
    public readonly emoji: number, // 表情ID
  ) {}
}

/**
 * 发送捐赠金币意图事件
 * 当玩家向其他玩家捐赠金币时触发
 */
export class SendDonateGoldIntentEvent implements GameEvent {
  constructor(
    public readonly recipient: PlayerView, // 接收金币的玩家
    public readonly gold: Gold | null,     // 捐赠的金币数量，null表示取消捐赠
  ) {}
}

/**
 * 发送捐赠兵力意图事件
 * 当玩家向其他玩家捐赠兵力时触发
 */
export class SendDonateTroopsIntentEvent implements GameEvent {
  constructor(
    public readonly recipient: PlayerView,   // 接收兵力的玩家
    public readonly troops: number | null,   // 捐赠的兵力数量，null表示取消捐赠
  ) {}
}

/**
 * 发送快速聊天事件
 * 当玩家使用预设的快速聊天消息时触发
 */
export class SendQuickChatEvent implements GameEvent {
  constructor(
    public readonly recipient: PlayerView,    // 聊天消息的接收者
    public readonly quickChatKey: string,     // 快速聊天的键值
    public readonly target?: PlayerID,        // 可选的目标玩家ID
  ) {}
}

/**
 * 发送禁运意图事件
 * 当玩家对其他玩家实施或取消禁运时触发
 */
export class SendEmbargoIntentEvent implements GameEvent {
  constructor(
    public readonly target: PlayerView,           // 禁运目标玩家
    public readonly action: "start" | "stop",    // 禁运动作：开始或停止
  ) {}
}

/**
 * 发送删除单位意图事件
 * 当玩家要删除某个单位时触发
 */
export class SendDeleteUnitIntentEvent implements GameEvent {
  constructor(public readonly unitId: number) {} // 要删除的单位ID
}

/**
 * 取消攻击意图事件
 * 当玩家取消正在进行的攻击时触发
 */
export class CancelAttackIntentEvent implements GameEvent {
  constructor(public readonly attackID: string) {} // 要取消的攻击ID
}

/**
 * 取消船只意图事件
 * 当玩家取消船只的移动或攻击指令时触发
 */
export class CancelBoatIntentEvent implements GameEvent {
  constructor(public readonly unitID: number) {} // 要取消指令的船只单位ID
}

/**
 * 发送获胜者事件
 * 当游戏结束时发送获胜者信息和所有玩家统计数据
 */
export class SendWinnerEvent implements GameEvent {
  constructor(
    public readonly winner: Winner,                    // 获胜者信息
    public readonly allPlayersStats: AllPlayersStats, // 所有玩家的统计数据
  ) {}
}

/**
 * 发送哈希事件
 * 用于游戏状态同步验证，发送当前游戏回合的哈希值
 */
export class SendHashEvent implements GameEvent {
  constructor(
    public readonly tick: Tick,   // 游戏回合数
    public readonly hash: number, // 游戏状态哈希值
  ) {}
}

/**
 * 移动战舰意图事件
 * 当玩家移动战舰到指定位置时触发
 */
export class MoveWarshipIntentEvent implements GameEvent {
  constructor(
    public readonly unitId: number, // 战舰单位ID
    public readonly tile: number,   // 目标地图位置
  ) {}
}

/**
 * 发送踢出玩家意图事件
 * 当房主要踢出某个玩家时触发
 */
export class SendKickPlayerIntentEvent implements GameEvent {
  constructor(public readonly target: string) {} // 要踢出的玩家标识
}

/**
 * Transport类 - 游戏传输层核心管理器
 * 
 * 负责管理客户端与服务器之间的所有通信，包括：
 * - WebSocket连接的建立、维护和重连
 * - 本地服务器连接（用于单人游戏和回放）
 * - 游戏消息的发送和接收
 * - 心跳检测和连接状态管理
 * - 各种游戏事件的处理和转发
 */
export class Transport {
  /** WebSocket连接实例，null表示未连接 */
  private socket: WebSocket | null = null;

  /** 本地服务器实例，用于单人游戏和回放模式 */
  private localServer: LocalServer;

  /** 消息缓冲区，存储待发送的消息 */
  private buffer: string[] = [];

  /** 连接成功回调函数 */
  private onconnect: () => void;
  /** 消息接收回调函数 */
  private onmessage: (msg: ServerMessage) => void;

  /** 心跳检测定时器ID，null表示未启动心跳 */
  private pingInterval: number | null = null;
  /** 是否为本地连接（单人游戏或回放模式） */
  public readonly isLocal: boolean;
  
  /**
   * Transport构造函数
   * @param lobbyConfig 游戏大厅配置信息
   * @param eventBus 事件总线，用于处理游戏事件
   */
  constructor(
    private lobbyConfig: LobbyConfig, // 游戏大厅配置
    private eventBus: EventBus,       // 事件总线
  ) {

    // If gameRecord is not null, we are replaying an archived game.
    // For multiplayer games, GameConfig is not known until game starts.
    this.isLocal =
      lobbyConfig.gameRecord !== undefined ||
      lobbyConfig.gameStartInfo?.config.gameType === GameType.Singleplayer;

    this.eventBus.on(SendAllianceRequestIntentEvent, (e) =>
      this.onSendAllianceRequest(e),
    );
    this.eventBus.on(SendAllianceReplyIntentEvent, (e) =>
      this.onAllianceRequestReplyUIEvent(e),
    );
    this.eventBus.on(SendAllianceExtensionIntentEvent, (e) =>
      this.onSendAllianceExtensionIntent(e),
    );
    this.eventBus.on(SendBreakAllianceIntentEvent, (e) =>
      this.onBreakAllianceRequestUIEvent(e),
    );
    this.eventBus.on(SendSpawnIntentEvent, (e) =>
      this.onSendSpawnIntentEvent(e),
    );
    this.eventBus.on(SendAttackIntentEvent, (e) => this.onSendAttackIntent(e));
    this.eventBus.on(SendUpgradeStructureIntentEvent, (e) =>
      this.onSendUpgradeStructureIntent(e),
    );
    this.eventBus.on(SendBoatAttackIntentEvent, (e) =>
      this.onSendBoatAttackIntent(e),
    );
    this.eventBus.on(SendTargetPlayerIntentEvent, (e) =>
      this.onSendTargetPlayerIntent(e),
    );
    this.eventBus.on(SendEmojiIntentEvent, (e) => this.onSendEmojiIntent(e));
    this.eventBus.on(SendDonateGoldIntentEvent, (e) =>
      this.onSendDonateGoldIntent(e),
    );
    this.eventBus.on(SendDonateTroopsIntentEvent, (e) =>
      this.onSendDonateTroopIntent(e),
    );
    this.eventBus.on(SendQuickChatEvent, (e) => this.onSendQuickChatIntent(e));
    this.eventBus.on(SendEmbargoIntentEvent, (e) =>
      this.onSendEmbargoIntent(e),
    );
    this.eventBus.on(BuildUnitIntentEvent, (e) => this.onBuildUnitIntent(e));

    this.eventBus.on(PauseGameEvent, (e) => this.onPauseGameEvent(e));
    this.eventBus.on(SendWinnerEvent, (e) => this.onSendWinnerEvent(e));
    this.eventBus.on(SendHashEvent, (e) => this.onSendHashEvent(e));
    this.eventBus.on(CancelAttackIntentEvent, (e) =>
      this.onCancelAttackIntentEvent(e),
    );
    this.eventBus.on(CancelBoatIntentEvent, (e) =>
      this.onCancelBoatIntentEvent(e),
    );

    this.eventBus.on(MoveWarshipIntentEvent, (e) => {
      this.onMoveWarshipEvent(e);
    });

    this.eventBus.on(SendDeleteUnitIntentEvent, (e) =>
      this.onSendDeleteUnitIntent(e),
    );

    this.eventBus.on(SendKickPlayerIntentEvent, (e) =>
      this.onSendKickPlayerIntent(e),
    );
  }

  /**
   * 启动心跳检测
   * 定期向服务器发送ping消息以保持连接活跃
   * 仅在远程连接模式下有效，本地连接不需要心跳
   */
  private startPing() {
    if (this.isLocal) return; // 本地连接不需要心跳检测
    this.pingInterval ??= window.setInterval(() => {
      if (this.socket !== null && this.socket.readyState === WebSocket.OPEN) {
        this.sendMsg({
          type: "ping",
        } satisfies ClientPingMessage);
      }
    }, 5 * 1000); // 每5秒发送一次心跳
  }

  /**
   * 停止心跳检测
   * 清除心跳定时器，通常在连接断开时调用
   */
  private stopPing() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 建立连接
   * 根据配置选择本地连接或远程连接
   * @param onconnect 连接成功时的回调函数
   * @param onmessage 接收到消息时的回调函数
   */
  public connect(
    onconnect: () => void,
    onmessage: (message: ServerMessage) => void,
  ) {
    if (this.isLocal) {
      this.connectLocal(onconnect, onmessage); // 建立本地连接
    } else {
      this.connectRemote(onconnect, onmessage); // 建立远程连接
    }
  }

  /**
   * 建立本地连接
   * 用于单人游戏和回放模式，创建本地服务器实例
   * @param onconnect 连接成功时的回调函数
   * @param onmessage 接收到消息时的回调函数
   */
  private connectLocal(
    onconnect: () => void,
    onmessage: (message: ServerMessage) => void,
  ) {
    this.localServer = new LocalServer(
      this.lobbyConfig,           // 游戏配置
      onconnect,                  // 连接成功回调
      onmessage,                  // 消息处理回调
      this.lobbyConfig.gameRecord !== undefined, // 是否为回放模式
      this.eventBus,              // 事件总线
    );
    this.localServer.start(); // 启动本地服务器
  }

  /**
   * 建立远程连接
   * 用于多人在线游戏，通过WebSocket连接到游戏服务器
   * @param onconnect 连接成功时的回调函数
   * @param onmessage 接收到消息时的回调函数
   */
  private connectRemote(
    onconnect: () => void,
    onmessage: (message: ServerMessage) => void,
  ) {
    this.startPing(); // 启动心跳检测
    this.killExistingSocket(); // 关闭现有连接
    
    // 构建WebSocket连接URL
    const wsHost = window.location.host;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const workerPath = this.lobbyConfig.serverConfig.workerPath(
      this.lobbyConfig.gameID,
    );
    this.socket = new WebSocket(`${wsProtocol}//${wsHost}/${workerPath}`);
    
    // 保存回调函数
    this.onconnect = onconnect;
    this.onmessage = onmessage;
    
    // 连接成功处理
    this.socket.onopen = () => {
      console.log("Connected to game server!");
      if (this.socket === null) {
        console.error("socket is null");
        return;
      }
      
      // 发送缓冲区中的消息
      while (this.buffer.length > 0) {
        console.log("sending dropped message");
        const msg = this.buffer.pop();
        if (msg === undefined) {
          console.warn("msg is undefined");
          continue;
        }
        this.socket.send(msg);
      }
      onconnect(); // 调用连接成功回调

    };
    // 消息接收处理
    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        const result = ServerMessageSchema.safeParse(parsed);
        if (!result.success) {
          const error = z.prettifyError(result.error);
          console.error("Error parsing server message", error);
          return;
        }
        this.onmessage(result.data); // 调用消息处理回调
      } catch (e) {
        console.error("Error in onmessage handler:", e, event.data);
        return;
      }
    };
    
    // 连接错误处理
    this.socket.onerror = (err) => {
      console.error("Socket encountered error: ", err, "Closing socket");
      if (this.socket === null) return;
      this.socket.close();
    };
    
    // 连接关闭处理
    this.socket.onclose = (event: CloseEvent) => {
      console.log(
        `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`,
      );
      if (event.code === 1002) {
        // TODO: make this a modal
        alert(`connection refused: ${event.reason}`); // 连接被拒绝
      } else if (event.code !== 1000) {
        console.log(`recieved error code ${event.code}, reconnecting`);
        this.reconnect(); // 自动重连
      }
    };
  }

  /**
   * 重新连接
   * 使用之前保存的回调函数重新建立连接
   */
  public reconnect() {
    this.connect(this.onconnect, this.onmessage);
  }

  /**
   * 回合完成通知
   * 通知本地服务器当前回合已完成（仅本地模式有效）
   */
  public turnComplete() {
    if (this.isLocal) {
      this.localServer.turnComplete();
    }
  }

  /**
   * 加入游戏
   * 向服务器发送加入游戏的请求消息
   * @param numTurns 当前回合数
   */
  joinGame(numTurns: number) {
    this.sendMsg({
      type: "join",
      gameID: this.lobbyConfig.gameID,           // 游戏ID
      clientID: this.lobbyConfig.clientID,       // 客户端ID
      lastTurn: numTurns,                        // 最后回合数
      token: this.lobbyConfig.token,             // 认证令牌
      username: this.lobbyConfig.playerName,     // 玩家用户名
      flag: this.lobbyConfig.flag,               // 玩家旗帜
      patternName: this.lobbyConfig.patternName, // 图案名称
    } satisfies ClientJoinMessage);
  }

  /**
   * 离开游戏
   * 断开连接并清理资源
   */
  leaveGame() {
    if (this.isLocal) {
      this.localServer.endGame(); // 结束本地游戏
      return;
    }
    
    this.stopPing(); // 停止心跳检测
    if (this.socket === null) return;
    
    if (this.socket.readyState === WebSocket.OPEN) {
      console.log("on stop: leaving game");
      this.socket.close(); // 关闭WebSocket连接
    } else {
      console.log(
        "WebSocket is not open. Current state:",
        this.socket.readyState,
      );
      console.error("attempting reconnect");
    }
    this.socket.onclose = (event: CloseEvent) => {};
  }

  /**
   * 处理发送联盟请求事件
   * @param event 联盟请求事件
   */
  private onSendAllianceRequest(event: SendAllianceRequestIntentEvent) {
    this.sendIntent({
      type: "allianceRequest",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
    });
  }

  /**
   * 处理联盟请求回复事件
   * @param event 联盟请求回复事件
   */
  private onAllianceRequestReplyUIEvent(event: SendAllianceReplyIntentEvent) {
    this.sendIntent({
      type: "allianceRequestReply",
      clientID: this.lobbyConfig.clientID,
      requestor: event.requestor.id(),
      accept: event.accepted,
    });
  }

  /**
   * 处理解除联盟请求事件
   * @param event 解除联盟事件
   */
  private onBreakAllianceRequestUIEvent(event: SendBreakAllianceIntentEvent) {
    this.sendIntent({
      type: "breakAlliance",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
    });
  }

  /**
   * 处理联盟延期请求事件
   * @param event 联盟延期事件
   */
  private onSendAllianceExtensionIntent(
    event: SendAllianceExtensionIntentEvent,
  ) {
    this.sendIntent({
      type: "allianceExtension",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
    });
  }

  /**
   * 处理生成单位事件
   * @param event 生成单位事件
   */
  private onSendSpawnIntentEvent(event: SendSpawnIntentEvent) {
    this.sendIntent({
      type: "spawn",
      clientID: this.lobbyConfig.clientID,
      tile: event.tile,
    });
  }

  /**
   * 处理攻击意图事件
   * @param event 攻击事件
   */
  private onSendAttackIntent(event: SendAttackIntentEvent) {
    this.sendIntent({
      type: "attack",
      clientID: this.lobbyConfig.clientID,
      targetID: event.targetID,
      troops: event.troops,
    });
  }

  /**
   * 处理船只攻击意图事件
   * @param event 船只攻击事件
   */
  private onSendBoatAttackIntent(event: SendBoatAttackIntentEvent) {
    this.sendIntent({
      type: "boat",
      clientID: this.lobbyConfig.clientID,
      targetID: event.targetID,
      troops: event.troops,
      dst: event.dst,
      src: event.src,
    });
  }

  /**
   * 处理升级建筑意图事件
   * @param event 升级建筑事件
   */
  private onSendUpgradeStructureIntent(event: SendUpgradeStructureIntentEvent) {
    this.sendIntent({
      type: "upgrade_structure",
      unit: event.unitType,
      clientID: this.lobbyConfig.clientID,
      unitId: event.unitId,
    });
  }

  /**
   * 处理目标玩家意图事件
   * @param event 目标玩家事件
   */
  private onSendTargetPlayerIntent(event: SendTargetPlayerIntentEvent) {
    this.sendIntent({
      type: "targetPlayer",
      clientID: this.lobbyConfig.clientID,
      target: event.targetID,
    });
  }

  /**
   * 处理发送表情意图事件
   * @param event 表情事件
   */
  private onSendEmojiIntent(event: SendEmojiIntentEvent) {
    this.sendIntent({
      type: "emoji",
      clientID: this.lobbyConfig.clientID,
      recipient:
        event.recipient === AllPlayers ? AllPlayers : event.recipient.id(),
      emoji: event.emoji,
    });
  }

  /**
   * 处理捐赠金币意图事件
   * @param event 捐赠金币事件
   */
  private onSendDonateGoldIntent(event: SendDonateGoldIntentEvent) {
    this.sendIntent({
      type: "donate_gold",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
      gold: event.gold,
    });
  }

  /**
   * 处理捐赠兵力意图事件
   * @param event 捐赠兵力事件
   */
  private onSendDonateTroopIntent(event: SendDonateTroopsIntentEvent) {
    this.sendIntent({
      type: "donate_troops",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
      troops: event.troops,
    });
  }

  /**
   * 处理快速聊天意图事件
   * @param event 快速聊天事件
   */
  private onSendQuickChatIntent(event: SendQuickChatEvent) {
    this.sendIntent({
      type: "quick_chat",
      clientID: this.lobbyConfig.clientID,
      recipient: event.recipient.id(),
      quickChatKey: event.quickChatKey,
      target: event.target,
    });
  }

  /**
   * 处理禁运意图事件
   * @param event 禁运事件
   */
  private onSendEmbargoIntent(event: SendEmbargoIntentEvent) {
    this.sendIntent({
      type: "embargo",
      clientID: this.lobbyConfig.clientID,
      targetID: event.target.id(),
      action: event.action,
    });
  }

  /**
   * 处理建造单位意图事件
   * @param event 建造单位事件
   */
  private onBuildUnitIntent(event: BuildUnitIntentEvent) {
    this.sendIntent({
      type: "build_unit",
      clientID: this.lobbyConfig.clientID,
      unit: event.unit,
      tile: event.tile,
    });
  }

  /**
   * 处理暂停游戏事件
   * @param event 暂停游戏事件
   */
  private onPauseGameEvent(event: PauseGameEvent) {
    if (!this.isLocal) {
      console.log(`cannot pause multiplayer games`); // 多人游戏无法暂停
      return;
    }
    if (event.paused) {
      this.localServer.pause();  // 暂停本地服务器
    } else {
      this.localServer.resume(); // 恢复本地服务器
    }
  }

  /**
   * 处理发送获胜者事件
   * @param event 获胜者事件
   */
  private onSendWinnerEvent(event: SendWinnerEvent) {
    if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
      this.sendMsg({
        type: "winner",
        winner: event.winner,
        allPlayersStats: event.allPlayersStats,
      } satisfies ClientSendWinnerMessage);
    } else {
      console.log(
        "WebSocket is not open. Current state:",
        this.socket?.readyState,
      );
      console.log("attempting reconnect");
    }
  }

  /**
   * 处理发送哈希事件
   * @param event 哈希事件
   */
  private onSendHashEvent(event: SendHashEvent) {
    if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
      this.sendMsg({
        type: "hash",
        turnNumber: event.tick,
        hash: event.hash,
      } satisfies ClientHashMessage);
    } else {
      console.log(
        "WebSocket is not open. Current state:",
        this.socket!.readyState,
      );
      console.log("attempting reconnect");
    }
  }

  /**
   * 处理取消攻击意图事件
   * @param event 取消攻击事件
   */
  private onCancelAttackIntentEvent(event: CancelAttackIntentEvent) {
    this.sendIntent({
      type: "cancel_attack",
      clientID: this.lobbyConfig.clientID,
      attackID: event.attackID,
    });
  }

  /**
   * 处理取消船只意图事件
   * @param event 取消船只事件
   */
  private onCancelBoatIntentEvent(event: CancelBoatIntentEvent) {
    this.sendIntent({
      type: "cancel_boat",
      clientID: this.lobbyConfig.clientID,
      unitID: event.unitID,
    });
  }

  /**
   * 处理移动战舰事件
   * @param event 移动战舰事件
   */
  private onMoveWarshipEvent(event: MoveWarshipIntentEvent) {
    this.sendIntent({
      type: "move_warship",
      clientID: this.lobbyConfig.clientID,
      unitId: event.unitId,
      tile: event.tile,
    });
  }

  /**
   * 处理删除单位意图事件
   * @param event 删除单位事件
   */
  private onSendDeleteUnitIntent(event: SendDeleteUnitIntentEvent) {
    this.sendIntent({
      type: "delete_unit",
      clientID: this.lobbyConfig.clientID,
      unitId: event.unitId,
    });
  }

  /**
   * 处理踢出玩家意图事件
   * @param event 踢出玩家事件
   */
  private onSendKickPlayerIntent(event: SendKickPlayerIntentEvent) {
    this.sendIntent({
      type: "kick_player",
      clientID: this.lobbyConfig.clientID,
      target: event.target,
    });
  }

  /**
   * 发送游戏意图消息
   * 将游戏意图包装成消息并发送到服务器
   * @param intent 游戏意图对象
   */
  private sendIntent(intent: Intent) {
    if (this.isLocal || this.socket?.readyState === WebSocket.OPEN) {
      const msg = {
        type: "intent",
        intent: intent,
      } satisfies ClientIntentMessage;
      this.sendMsg(msg);
    } else {
      console.log(
        "WebSocket is not open. Current state:",
        this.socket?.readyState,
      );
      console.log("attempting reconnect");
    }
  }

  /**
   * 发送消息到服务器
   * 根据连接类型（本地或远程）发送消息
   * @param msg 客户端消息对象
   */
  private sendMsg(msg: ClientMessage) {
    if (this.isLocal) {
      // 转发消息到本地服务器
      this.localServer.onMessage(msg);
      return;
    } else if (this.socket === null) {
      // Socket缺失，不执行任何操作
      return;
    }
    const str = JSON.stringify(msg, replacer);
    if (this.socket.readyState === WebSocket.CLOSED) {
      // 缓存消息
      console.warn("socket not ready, closing and trying later");
      this.socket.close();
      this.socket = null;
      this.connectRemote(this.onconnect, this.onmessage);
      this.buffer.push(str);
    } else {
      // 直接发送消息
      this.socket.send(str);
    }
  }

  /**
   * 关闭并清理现有的WebSocket连接
   * 用于在建立新连接前清理旧连接，防止内存泄漏和连接冲突
   */
  private killExistingSocket(): void {
    // 如果没有现有连接，直接返回
    if (this.socket === null) {
      return;
    }
    // 移除所有事件监听器，防止内存泄漏
    this.socket.onmessage = null;
    this.socket.onopen = null;
    this.socket.onclose = null;
    this.socket.onerror = null;

    // 如果连接仍然打开，则关闭连接
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    // 清空socket引用
    this.socket = null;
  }
}
