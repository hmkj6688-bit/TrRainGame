/**
 * 本地游戏服务器模拟器
 * 
 * 这个类模拟了游戏服务器的行为，用于单人游戏模式和游戏回放功能。
 * 主要功能包括：
 * - 模拟多人游戏的服务器端逻辑
 * - 处理游戏回合的时间控制和执行
 * - 支持游戏回放和速度控制
 * - 管理游戏意图（Intent）的收集和分发
 * - 处理游戏哈希验证和同步检测
 * - 游戏结束时的数据归档
 * 
 * 使用场景：
 * - 单人游戏模式的服务器端模拟
 * - 游戏录像的回放功能
 * - 离线游戏的本地处理
 * - 游戏数据的验证和同步
 * 
 * 技术特点：
 * - 基于定时器的回合控制机制
 * - 支持暂停和恢复功能
 * - 可调节的回放速度
 * - 游戏数据压缩和归档
 * - 事件驱动的架构设计
 * - 哈希验证确保游戏同步
 */

// Zod 验证库，用于数据验证和错误处理
import { z } from "zod";
// 事件总线，用于组件间通信
import { EventBus } from "../core/EventBus";
// 游戏相关的数据结构和消息类型定义
import {
  AllPlayersStats,
  ClientMessage,
  ClientSendWinnerMessage,
  Intent,
  PartialGameRecordSchema,
  PlayerRecord,
  ServerMessage,
  ServerStartGameMessage,
  Turn,
} from "../core/Schemas";
// 工具函数，用于游戏记录处理和数据序列化
import {
  createPartialGameRecord,
  decompressGameRecord,
  replacer,
} from "../core/Util";
// 大厅配置类型定义
import { LobbyConfig } from "./ClientGameRunner";
// 回放速度变化事件类型
import { ReplaySpeedChangeEvent } from "./InputHandler";
// 获取持久化ID的工具函数
import { getPersistentID } from "./Main";
// 默认回放速度倍数常量
import { defaultReplaySpeedMultiplier } from "./utilities/ReplaySpeedMultiplier";

/**
 * 本地游戏服务器类
 * 
 * 模拟游戏服务器的核心功能，支持单人游戏和回放模式。
 * 管理游戏回合、意图收集、时间控制等服务器端逻辑。
 */
export class LocalServer {
  /**
   * 回放模式下的所有回合数据
   * 
   * 从游戏记录中解压得到的完整回合序列，用于回放时
   * 按顺序重现游戏过程。只在回放模式下使用。
   */
  // All turns from the game record on replay.
  private replayTurns: Turn[] = [];

  /**
   * 当前游戏的回合数据
   * 
   * 存储游戏进行过程中产生的所有回合数据，包括
   * 回合号、意图列表等信息。用于游戏记录和同步。
   */
  private turns: Turn[] = [];

  /**
   * 当前回合收集的意图列表
   * 
   * 存储玩家在当前回合中发出的所有游戏意图（如移动、攻击等）。
   * 在回合结束时会被打包成回合数据并清空。
   */
  private intents: Intent[] = [];
  
  /**
   * 游戏开始时间戳
   * 
   * 记录游戏实际开始的时间，用于计算游戏总时长
   * 和生成游戏记录的时间信息。
   */
  private startedAt: number;

  /**
   * 游戏暂停状态
   * 
   * 控制游戏是否处于暂停状态。当为 true 时，
   * 停止处理新的意图和回合推进。
   */
  private paused = false;
  
  /**
   * 回放速度倍数
   * 
   * 控制回放模式下的游戏速度，默认为正常速度。
   * 可以通过事件动态调整，支持快进和慢放。
   */
  private replaySpeedMultiplier = defaultReplaySpeedMultiplier;

  /**
   * 游戏获胜者信息
   * 
   * 存储游戏结束时的获胜者数据，包括获胜条件、
   * 获胜玩家等信息。初始为 null，游戏结束时设置。
   */
  private winner: ClientSendWinnerMessage | null = null;
  
  /**
   * 所有玩家的统计数据
   * 
   * 存储游戏中所有玩家的统计信息，如得分、击杀数、
   * 存活时间等。以客户端ID为键的映射表。
   */
  private allPlayersStats: AllPlayersStats = {};

  /**
   * 已执行的回合数
   * 
   * 记录客户端已经处理完成的回合数量，用于
   * 控制回合推进的节奏和同步。
   */
  private turnsExecuted = 0;
  
  /**
   * 当前回合开始时间
   * 
   * 记录当前回合开始的时间戳，用于计算回合
   * 间隔和控制回合推进的时机。
   */
  private turnStartTime = 0;

  /**
   * 回合检查定时器
   * 
   * 用于定期检查是否需要推进到下一回合的定时器。
   * 每5毫秒检查一次回合推进条件。
   */
  private turnCheckInterval: NodeJS.Timeout;

  /**
   * 构造函数
   * 
   * 初始化本地服务器实例，设置游戏配置和回调函数。
   * 
   * @param lobbyConfig - 大厅配置，包含游戏设置、服务器配置、游戏记录等
   * @param clientConnect - 客户端连接回调，在服务器启动时调用
   * @param clientMessage - 客户端消息回调，用于向客户端发送服务器消息
   * @param isReplay - 是否为回放模式，影响意图处理和游戏流程
   * @param eventBus - 事件总线，用于处理回放速度变化等事件
   */
  constructor(
    private lobbyConfig: LobbyConfig,
    private clientConnect: () => void,
    private clientMessage: (message: ServerMessage) => void,
    private isReplay: boolean,
    private eventBus: EventBus,
  ) {}

  /**
   * 启动本地服务器
   * 
   * 初始化游戏服务器的核心功能：
   * 1. 设置回合检查定时器，控制游戏节奏
   * 2. 监听回放速度变化事件
   * 3. 记录游戏开始时间
   * 4. 触发客户端连接
   * 5. 处理回放模式的游戏记录
   * 6. 发送游戏开始消息给客户端
   * 
   * @throws {Error} 当缺少游戏开始信息时抛出错误
   */
  start() {
    // 设置回合检查定时器，每5毫秒检查一次是否需要推进回合
    this.turnCheckInterval = setInterval(() => {
      // 计算当前回合间隔时间（考虑回放速度倍数）
      const turnIntervalMs =
        this.lobbyConfig.serverConfig.turnIntervalMs() *
        this.replaySpeedMultiplier;

      // 检查是否满足推进回合的条件：
      // 1. 客户端已处理完所有回合
      // 2. 当前回合时间已到
      if (
        this.turnsExecuted === this.turns.length &&
        Date.now() > this.turnStartTime + turnIntervalMs
      ) {
        this.turnStartTime = Date.now();
        // 结束当前回合，让客户端开始处理新回合
        this.endTurn();
      }
    }, 5);

    // 监听回放速度变化事件，动态调整游戏速度
    this.eventBus.on(ReplaySpeedChangeEvent, (event) => {
      this.replaySpeedMultiplier = event.replaySpeedMultiplier;
    });

    // 记录游戏开始时间
    this.startedAt = Date.now();
    
    // 触发客户端连接回调
    this.clientConnect();
    
    // 如果是回放模式，解压游戏记录获取回合数据
    if (this.lobbyConfig.gameRecord) {
      this.replayTurns = decompressGameRecord(
        this.lobbyConfig.gameRecord,
      ).turns;
    }
    
    // 验证游戏开始信息是否存在
    if (this.lobbyConfig.gameStartInfo === undefined) {
      throw new Error("missing gameStartInfo");
    }
    
    // 向客户端发送游戏开始消息
    this.clientMessage({
      type: "start",
      gameStartInfo: this.lobbyConfig.gameStartInfo,
      turns: [],
    } satisfies ServerStartGameMessage);
  }

  /**
   * 暂停游戏
   * 
   * 设置游戏为暂停状态，停止处理新的意图。
   * 在暂停状态下，客户端发送的意图将被忽略。
   */
  pause() {
    this.paused = true;
  }

  /**
   * 恢复游戏
   * 
   * 取消游戏的暂停状态，恢复正常的意图处理。
   * 游戏将继续接收和处理客户端的意图。
   */
  resume() {
    this.paused = false;
  }

  /**
   * 处理客户端消息
   * 
   * 接收并处理来自客户端的各种消息类型：
   * 1. intent - 游戏意图消息，包含玩家的游戏操作
   * 2. hash - 哈希验证消息，用于确保游戏状态同步
   * 
   * @param clientMsg - 客户端发送的消息对象
   */
  onMessage(clientMsg: ClientMessage) {
    // 处理意图消息
    if (clientMsg.type === "intent") {
      // 回放模式下不处理新的意图
      if (this.lobbyConfig.gameRecord) {
        // If we are replaying a game, we don't want to process intents
        return;
      }
      // 暂停状态下不处理意图
      if (this.paused) {
        return;
      }
      // 将意图添加到当前回合的意图列表中
      this.intents.push(clientMsg.intent);
    }
    
    // 处理哈希验证消息
    if (clientMsg.type === "hash") {
      // 非回放模式：存储哈希用于游戏记录
      if (!this.lobbyConfig.gameRecord) {
        // 单人游戏中，每100回合存储一次哈希以减少游戏记录大小
        if (clientMsg.turnNumber % 100 === 0) {
          // In singleplayer, only store hash every 100 turns to reduce size of game record.
          this.turns[clientMsg.turnNumber].hash = clientMsg.hash;
        }
        return;
      }
      
      // 回放模式：验证哈希确保游戏状态一致性
      // If we are replaying a game then verify hash.
      const archivedHash = this.replayTurns[clientMsg.turnNumber].hash;
      
      // 检查是否存在存档的哈希值
      if (!archivedHash) {
        console.warn(
          `no archived hash found for turn ${clientMsg.turnNumber}, client hash: ${clientMsg.hash}`,
        );
        return;
      }
      
      // 比较客户端哈希与存档哈希
      if (archivedHash !== clientMsg.hash) {
        // 哈希不匹配，检测到同步错误
        console.error(
          `desync detected on turn ${clientMsg.turnNumber}, client hash: ${clientMsg.hash}, server hash: ${archivedHash}`,
        );
        // 向客户端发送同步错误消息
        this.clientMessage({
          type: "desync",
          turn: clientMsg.turnNumber,
          correctHash: archivedHash,
          clientsWithCorrectHash: 0,
          totalActiveClients: 1,
          yourHash: clientMsg.hash,
        });
      } else {
        // 哈希匹配，验证成功
        console.log(
          `hash verified on turn ${clientMsg.turnNumber}, client hash: ${clientMsg.hash}, server hash: ${archivedHash}`,
        );
      }
    }
    // 处理获胜者消息
    if (clientMsg.type === "winner") {
      this.winner = clientMsg;
      this.allPlayersStats = clientMsg.allPlayersStats;
    }
  }

  /**
   * 回合完成通知
   * 
   * 客户端调用此方法通知服务器已完成当前回合的处理。
   * 用于同步服务器和客户端的回合进度。
   */
  // This is so the client can tell us when it finished processing the turn.
  public turnComplete() {
    this.turnsExecuted++;
  }

  /**
   * 结束当前回合
   * 
   * 服务器端的回合结束处理：
   * 1. 检查游戏暂停状态
   * 2. 处理回放模式的回合数据
   * 3. 创建新的回合对象
   * 4. 清空当前意图列表
   * 5. 向客户端发送回合数据
   * 
   * 在回放模式下，从预存的回合数据中获取意图；
   * 在正常游戏中，使用收集到的玩家意图。
   */
  // endTurn in this context means the server has collected all the intents
  // and will send the turn to the client.
  private endTurn() {
    // 暂停状态下不处理回合结束
    if (this.paused) {
      return;
    }
    
    // 回放模式：从预存数据中获取回合信息
    if (this.replayTurns.length > 0) {
      // 检查是否已回放完所有回合
      if (this.turns.length >= this.replayTurns.length) {
        this.endGame();
        return;
      }
      // 从回放数据中获取当前回合的意图
      this.intents = this.replayTurns[this.turns.length].intents;
    }
    
    // 创建当前回合的数据对象
    const pastTurn: Turn = {
      turnNumber: this.turns.length,
      intents: this.intents,
    };
    
    // 将回合数据添加到历史记录中
    this.turns.push(pastTurn);
    
    // 清空当前意图列表，准备下一回合
    this.intents = [];
    
    // 向客户端发送回合数据
    this.clientMessage({
      type: "turn",
      turn: pastTurn,
    });
  }

  /**
   * 结束游戏
   * 
   * 处理游戏结束的完整流程：
   * 1. 清理定时器资源
   * 2. 创建游戏记录
   * 3. 验证记录数据
   * 4. 压缩并上传游戏数据
   * 
   * 在回放模式下直接返回，不进行数据存储。
   * 在正常游戏中，将完整的游戏数据存档到服务器。
   */
  public endGame() {
    console.log("local server ending game");
    
    // 清理回合检查定时器
    clearInterval(this.turnCheckInterval);
    
    // 回放模式下不需要存储数据
    if (this.isReplay) {
      return;
    }
    
    // 构建玩家记录数组
    const players: PlayerRecord[] = [
      {
        persistentID: getPersistentID(),
        username: this.lobbyConfig.playerName,
        clientID: this.lobbyConfig.clientID,
        stats: this.allPlayersStats[this.lobbyConfig.clientID],
      },
    ];
    
    // 验证游戏开始信息
    if (this.lobbyConfig.gameStartInfo === undefined) {
      throw new Error("missing gameStartInfo");
    }
    
    // 创建部分游戏记录对象
    const record = createPartialGameRecord(
      this.lobbyConfig.gameStartInfo.gameID,
      this.lobbyConfig.gameStartInfo.config,
      players,
      this.turns,
      this.startedAt,
      Date.now(),
      this.winner?.winner,
    );

    // 验证游戏记录数据格式
    const result = PartialGameRecordSchema.safeParse(record);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Error parsing game record", error);
      return;
    }
    
    // 获取工作线程路径
    const workerPath = this.lobbyConfig.serverConfig.workerPath(
      this.lobbyConfig.gameStartInfo.gameID,
    );

    // 序列化游戏记录数据
    const jsonString = JSON.stringify(result.data, replacer);

    // 压缩并上传游戏数据
    compress(jsonString)
      .then((compressedData) => {
        return fetch(`/${workerPath}/api/archive_singleplayer_game`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
          },
          body: compressedData,
          keepalive: true, // Ensures request completes even if page unloads
        });
      })
      .catch((error) => {
        console.error("Failed to archive singleplayer game:", error);
      });
  }
}

/**
 * 数据压缩函数
 * 
 * 使用 gzip 算法压缩字符串数据，减少网络传输的数据量。
 * 主要用于压缩游戏记录数据，提高上传效率。
 * 
 * @param data - 需要压缩的字符串数据
 * @returns Promise<Uint8Array> - 压缩后的二进制数据
 */
async function compress(data: string): Promise<Uint8Array> {
  // 创建 gzip 压缩流
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // 将字符串数据写入压缩流
  // Write the data to the compression stream
  writer.write(new TextEncoder().encode(data));
  writer.close();

  // 读取压缩后的数据块
  // Read the compressed data
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      chunks.push(value);
    }
  }

  // 将所有数据块合并为单个 Uint8Array
  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const compressedData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressedData.set(chunk, offset);
    offset += chunk.length;
  }

  // 返回压缩后的完整数据
  return compressedData;
}
