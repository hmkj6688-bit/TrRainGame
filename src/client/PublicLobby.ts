/**
 * 公共大厅组件
 * 
 * 该组件负责显示和管理游戏的公共大厅功能，是玩家加入多人游戏的主要入口。
 * 
 * 主要功能：
 * - 实时获取和显示可用的公共游戏大厅列表
 * - 展示大厅信息：地图、游戏模式、玩家数量、开始倒计时等
 * - 处理玩家加入/离开大厅的交互逻辑
 * - 动态加载和缓存地图预览图片
 * - 提供防抖机制防止重复点击
 * - 支持多语言界面显示
 * 
 * 组件特性：
 * - 基于Lit框架的Web组件
 * - 使用Light DOM渲染，便于样式继承
 * - 自动定时刷新大厅列表（每秒更新）
 * - 响应式设计，适配不同屏幕尺寸
 * - 集成地图文件加载器获取地图预览
 * 
 * 交互流程：
 * 1. 组件连接时开始定时获取大厅列表
 * 2. 显示第一个可用大厅的详细信息
 * 3. 用户点击加入大厅，触发join-lobby事件
 * 4. 支持取消加入，触发leave-lobby事件
 * 5. 组件断开时清理定时器和资源
 * 
 * 使用场景：
 * - 游戏主界面的公共大厅区域
 * - 快速匹配功能的实现基础
 * - 多人游戏的入口点
 */

import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { renderDuration, translateText } from "../client/Utils";
import { GameMapType, GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { JoinLobbyEvent } from "./Main";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";

/**
 * 公共大厅组件类
 * 
 * 这是一个基于LitElement的Web组件，用于显示和管理游戏的公共大厅。
 * 该组件提供了完整的大厅浏览和加入功能，包括实时更新、地图预览、
 * 玩家计数和游戏开始倒计时等功能。
 */
@customElement("public-lobby")
export class PublicLobby extends LitElement {
  /**
   * 大厅列表状态
   * 
   * 存储从服务器获取的所有可用游戏大厅信息。
   * 包含每个大厅的游戏配置、玩家数量、开始时间等详细信息。
   * 该数组会定时更新以保持数据的实时性。
   */
  @state() private lobbies: GameInfo[] = [];

  /**
   * 大厅高亮状态
   * 
   * 指示当前大厅按钮是否处于高亮状态。
   * 当玩家成功加入大厅后，该状态会变为true，
   * 按钮会显示绿色高亮效果以提供视觉反馈。
   */
  @state() public isLobbyHighlighted: boolean = false;

  /**
   * 按钮防抖状态
   * 
   * 防止用户快速重复点击大厅按钮导致的重复请求。
   * 当该状态为true时，按钮会被禁用并显示加载状态，
   * 在设定的延迟时间后自动恢复可点击状态。
   */
  @state() private isButtonDebounced: boolean = false;

  /**
   * 地图图片缓存
   * 
   * 存储已加载的地图预览图片，以游戏ID为键，图片URL为值。
   * 这个缓存机制避免了重复加载相同地图的图片，
   * 提高了组件的性能和用户体验。
   */
  @state() private mapImages: Map<GameID, string> = new Map();

  /**
   * 大厅列表更新定时器
   * 
   * 用于定时获取最新的大厅列表信息。
   * 默认每秒执行一次更新，确保显示的大厅信息是最新的。
   * 组件销毁时会自动清理该定时器。
   */
  private lobbiesInterval: number | null = null;

  /**
   * 当前加入的大厅
   * 
   * 记录玩家当前加入的大厅信息。
   * 当玩家点击加入大厅时设置，点击离开时清空。
   * 用于判断玩家的大厅状态和处理离开逻辑。
   */
  private currLobby: GameInfo | null = null;

  /**
   * 防抖延迟时间（毫秒）
   * 
   * 定义按钮点击后的防抖延迟时间。
   * 在此时间内，按钮将保持禁用状态，
   * 防止用户意外的重复点击操作。
   */
  private debounceDelay: number = 750;

  /**
   * 大厅开始时间映射
   * 
   * 存储每个大厅的实际开始时间戳，以游戏ID为键。
   * 由于API响应可能有缓存，这个映射确保了
   * 倒计时显示的准确性和一致性。
   */
  private lobbyIDToStart = new Map<GameID, number>();

  /**
   * 创建渲染根元素
   * 
   * 重写父类方法，使用Light DOM而不是Shadow DOM进行渲染。
   * 这样可以让组件继承父级的CSS样式，便于主题和样式管理。
   * 
   * @returns 返回当前元素作为渲染根
   */
  createRenderRoot() {
    return this;
  }

  /**
   * 组件连接到DOM时的回调
   * 
   * 当组件被添加到DOM时执行初始化操作：
   * 1. 调用父类的连接回调
   * 2. 立即获取一次大厅列表数据
   * 3. 启动定时器，每秒自动更新大厅列表
   * 
   * 这确保了组件一旦显示就能立即展示最新的大厅信息。
   */
  connectedCallback() {
    super.connectedCallback();
    this.fetchAndUpdateLobbies();
    this.lobbiesInterval = window.setInterval(
      () => this.fetchAndUpdateLobbies(),
      1000,
    );
  }

  /**
   * 组件从DOM断开时的回调
   * 
   * 当组件被移除时执行清理操作：
   * 1. 调用父类的断开回调
   * 2. 清理定时器，停止自动更新
   * 3. 释放相关资源，防止内存泄漏
   * 
   * 这是良好的资源管理实践，避免组件销毁后仍有定时器运行。
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.lobbiesInterval !== null) {
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  /**
   * 获取并更新大厅列表
   * 
   * 这是核心的数据更新方法，负责：
   * 1. 从服务器获取最新的大厅列表
   * 2. 为每个大厅记录开始时间（用于准确的倒计时）
   * 3. 异步加载大厅对应的地图预览图片
   * 4. 处理获取过程中的错误
   * 
   * 该方法被定时器定期调用，确保数据的实时性。
   * 
   * @private
   */
  private async fetchAndUpdateLobbies(): Promise<void> {
    try {
      this.lobbies = await this.fetchLobbies();
      this.lobbies.forEach((l) => {
        // 存储开始时间，因为API端点有缓存，会导致时间显示不规律
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
        }

        // 如果地图图片尚未加载，则加载地图图片
        if (l.gameConfig && !this.mapImages.has(l.gameID)) {
          this.loadMapImage(l.gameID, l.gameConfig.gameMap);
        }
      });
    } catch (error) {
      console.error("Error fetching lobbies:", error);
    }
  }

  /**
   * 加载地图预览图片
   * 
   * 异步加载指定大厅的地图预览图片：
   * 1. 将地图名称转换为GameMapType枚举
   * 2. 使用地形地图加载器获取地图数据
   * 3. 获取WebP格式的地图预览图片路径
   * 4. 将图片URL缓存到mapImages映射中
   * 5. 触发组件更新以显示新加载的图片
   * 
   * @param gameID 游戏大厅的唯一标识符
   * @param gameMap 地图名称字符串
   * @private
   */
  private async loadMapImage(gameID: GameID, gameMap: string) {
    try {
      // 将字符串转换为GameMapType枚举值
      const mapType = gameMap as GameMapType;
      const data = terrainMapFileLoader.getMapData(mapType);
      this.mapImages.set(gameID, await data.webpPath());
      this.requestUpdate();
    } catch (error) {
      console.error("Failed to load map image:", error);
    }
  }

  /**
   * 从服务器获取大厅列表
   * 
   * 向服务器API发送请求获取当前可用的公共大厅列表：
   * 1. 发送GET请求到/api/public_lobbies端点
   * 2. 检查响应状态，处理HTTP错误
   * 3. 解析JSON响应数据
   * 4. 返回大厅信息数组
   * 
   * @returns Promise<GameInfo[]> 返回大厅信息数组的Promise
   * @throws 当网络请求失败或服务器返回错误时抛出异常
   */
  async fetchLobbies(): Promise<GameInfo[]> {
    try {
      const response = await fetch(`/api/public_lobbies`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.lobbies;
    } catch (error) {
      console.error("Error fetching lobbies:", error);
      throw error;
    }
  }

  /**
   * 停止大厅更新
   * 
   * 手动停止大厅列表的自动更新：
   * 1. 取消大厅高亮状态
   * 2. 清除更新定时器
   * 3. 重置定时器引用为null
   * 
   * 通常在用户离开大厅页面或组件不再需要更新时调用。
   * 
   * @public
   */
  public stop() {
    if (this.lobbiesInterval !== null) {
      this.isLobbyHighlighted = false;
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  /**
   * 渲染组件
   * 
   * 组件的主要渲染方法，负责生成大厅界面：
   * 1. 如果没有可用大厅，返回空模板
   * 2. 获取第一个大厅的信息进行显示
   * 3. 计算并格式化游戏开始倒计时
   * 4. 确定游戏模式和队伍配置的显示文本
   * 5. 渲染大厅按钮，包括地图预览、游戏信息、玩家数量等
   * 6. 根据大厅状态应用不同的视觉样式
   * 
   * @returns 返回Lit模板结果，包含完整的大厅界面
   */
  render() {
    if (this.lobbies.length === 0) return html``;

    const lobby = this.lobbies[0];
    if (!lobby?.gameConfig) {
      return;
    }
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));

    // 格式化时间显示为分钟和秒
    const timeDisplay = renderDuration(timeRemaining);

    const teamCount =
      lobby.gameConfig.gameMode === GameMode.Team
        ? (lobby.gameConfig.playerTeams ?? 0)
        : null;

    const mapImageSrc = this.mapImages.get(lobby.gameID);

    return html`
      <button
        @click=${() => this.lobbyClicked(lobby)}
        ?disabled=${this.isButtonDebounced}
        class="isolate grid h-40 grid-cols-[100%] grid-rows-[100%] place-content-stretch w-full overflow-hidden ${this
          .isLobbyHighlighted
          ? "bg-gradient-to-r from-green-600 to-green-500"
          : "bg-gradient-to-r from-blue-600 to-blue-500"} text-white font-medium rounded-xl transition-opacity duration-200 hover:opacity-90 ${this
          .isButtonDebounced
          ? "opacity-70 cursor-not-allowed"
          : ""}"
      >
        ${mapImageSrc
          ? html`<img
              src="${mapImageSrc}"
              alt="${lobby.gameConfig.gameMap}"
              class="place-self-start col-span-full row-span-full h-full -z-10"
              style="mask-image: linear-gradient(to left, transparent, #fff)"
            />`
          : html`<div
              class="place-self-start col-span-full row-span-full h-full -z-10 bg-gray-300"
            ></div>`}
        <div
          class="flex flex-col justify-between h-full col-span-full row-span-full p-4 md:p-6 text-right z-0"
        >
          <div>
            <div class="text-lg md:text-2xl font-semibold">
              ${translateText("public_lobby.join")}
            </div>
            <div class="text-md font-medium text-blue-100">
              <span
                class="text-sm ${this.isLobbyHighlighted
                  ? "text-green-600"
                  : "text-blue-600"} bg-white rounded-sm px-1"
              >
                ${lobby.gameConfig.gameMode === GameMode.Team
                  ? typeof teamCount === "string"
                    ? translateText(`public_lobby.teams_${teamCount}`)
                    : translateText("public_lobby.teams", {
                        num: teamCount ?? 0,
                      })
                  : translateText("game_mode.ffa")}</span
              >
              <span
                >${translateText(
                  `map.${lobby.gameConfig.gameMap.toLowerCase().replace(/\s+/g, "")}`,
                )}</span
              >
            </div>
          </div>

          <div>
            <div class="text-md font-medium text-blue-100">
              ${lobby.numClients} / ${lobby.gameConfig.maxPlayers}
            </div>
            <div class="text-md font-medium text-blue-100">${timeDisplay}</div>
          </div>
        </div>
      </button>
    `;
  }

  /**
   * 离开大厅
   * 
   * 处理玩家离开当前大厅的逻辑：
   * 1. 取消大厅高亮状态
   * 2. 清空当前大厅引用
   * 
   * 这个方法通常在玩家主动离开大厅或切换到其他大厅时调用。
   * 
   * @public
   */
  leaveLobby() {
    this.isLobbyHighlighted = false;
    this.currLobby = null;
  }

  /**
   * 处理大厅点击事件
   * 
   * 处理用户点击大厅按钮的交互逻辑：
   * 1. 检查防抖状态，防止重复点击
   * 2. 启用防抖机制，设置按钮临时禁用
   * 3. 根据当前状态决定加入或离开大厅：
   *    - 如果未加入任何大厅：加入点击的大厅，触发join-lobby事件
   *    - 如果已加入大厅：离开当前大厅，触发leave-lobby事件
   * 4. 在延迟后重置防抖状态
   * 
   * 这个方法实现了大厅的加入/离开切换功能，并提供了良好的用户体验。
   * 
   * @param lobby 被点击的大厅信息对象
   * @private
   */
  private lobbyClicked(lobby: GameInfo) {
    if (this.isButtonDebounced) {
      return;
    }

    // 设置防抖状态
    this.isButtonDebounced = true;

    // 在延迟后重置防抖
    setTimeout(() => {
      this.isButtonDebounced = false;
    }, this.debounceDelay);

    if (this.currLobby === null) {
      this.isLobbyHighlighted = true;
      this.currLobby = lobby;
      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobby.gameID,
            clientID: generateID(),
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("leave-lobby", {
          detail: { lobby: this.currLobby },
          bubbles: true,
          composed: true,
        }),
      );
      this.leaveLobby();
    }
  }
}
