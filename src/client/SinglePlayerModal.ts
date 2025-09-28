/**
 * 单人游戏模态框组件
 * 
 * 该组件提供了完整的单人游戏配置界面，允许玩家自定义游戏设置并启动单人游戏。
 * 
 * 主要功能：
 * - 地图选择：支持多种地图类型和随机地图选项
 * - 难度设置：提供多个难度级别供玩家选择
 * - 游戏模式：支持自由对战(FFA)和团队模式
 * - 团队配置：在团队模式下可设置队伍数量
 * - 游戏选项：机器人数量、禁用NPC、无限资源等
 * - 单位控制：可禁用特定类型的游戏单位
 * - 即时构建：加速建造功能
 * 
 * 组件特性：
 * - 基于Lit框架的响应式Web组件
 * - 使用Light DOM渲染，便于样式继承
 * - 支持键盘快捷键（ESC关闭）
 * - 集成用户设置和化妆品系统
 * - 多语言界面支持
 * - 响应式布局，适配不同屏幕尺寸
 * 
 * 配置选项：
 * - 地图类型：世界地图、区域地图、随机地图等
 * - 游戏难度：简单、中等、困难等级别
 * - 机器人设置：0-400个AI玩家
 * - 资源选项：无限金币、无限军队
 * - 建造选项：即时建造功能
 * - 单位限制：可选择性禁用特定单位类型
 * 
 * 交互流程：
 * 1. 玩家打开单人游戏模态框
 * 2. 配置各种游戏参数和选项
 * 3. 点击开始游戏按钮
 * 4. 系统收集用户名、国旗、图案等信息
 * 5. 生成游戏配置并触发join-lobby事件
 * 6. 关闭模态框，启动单人游戏
 * 
 * 使用场景：
 * - 游戏主菜单的单人游戏入口
 * - 离线游戏模式的配置界面
 * - 练习和测试功能的基础
 */

// Lit框架核心模块 - 用于创建Web组件
import { LitElement, html } from "lit";
// Lit装饰器 - 用于定义自定义元素、查询DOM元素和管理状态
import { customElement, query, state } from "lit/decorators.js";
// 随机地图预览图片资源
import randomMap from "../../resources/images/RandomMap.webp";
// 国际化工具函数 - 用于文本翻译
import { translateText } from "../client/Utils";
// 游戏核心类型和枚举定义
import {
  Difficulty,        // 游戏难度枚举
  Duos,             // 双人队伍配置
  GameMapType,      // 地图类型枚举
  GameMode,         // 游戏模式枚举（FFA/团队）
  GameType,         // 游戏类型枚举（单人/多人）
  Quads,            // 四人队伍配置
  Trios,            // 三人队伍配置
  UnitType,         // 游戏单位类型枚举
  mapCategories,    // 地图分类配置
} from "../core/game/Game";
// 用户设置管理类 - 处理用户偏好和配置
import { UserSettings } from "../core/game/UserSettings";
// 团队数量配置类型定义
import { TeamCountConfig } from "../core/Schemas";
// ID生成工具函数 - 用于生成唯一标识符
import { generateID } from "../core/Util";
// 化妆品系统 - 获取用户的图案等装饰品
import { getCosmetics } from "./Cosmetics";
// 国旗输入组件 - 用于选择玩家国旗
import { FlagInput } from "./FlagInput";
// 加入游戏大厅事件类型定义
import { JoinLobbyEvent } from "./Main";
// 用户名输入组件 - 用于输入玩家用户名
import { UsernameInput } from "./UsernameInput";
// 单位类型选项渲染工具 - 用于渲染可禁用的单位类型选择界面
import { renderUnitTypeOptions } from "./utilities/RenderUnitTypeOptions";

/**
 * 单人游戏模态框组件类
 * 
 * 基于LitElement的Web组件，提供完整的单人游戏配置界面。
 * 该组件管理所有单人游戏相关的设置选项，包括地图选择、难度设置、
 * 游戏模式配置等，并负责收集用户输入并启动游戏。
 */
@customElement("single-player-modal")
export class SinglePlayerModal extends LitElement {
  /** 模态框DOM元素引用，用于控制模态框的打开和关闭 */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };
  
  /** 当前选中的地图类型，默认为世界地图（World）- 最经典和平衡的地图选择 */
  @state() private selectedMap: GameMapType = GameMapType.World;
  
  /** 当前选中的游戏难度，默认为中等难度（Medium）- 适合大多数玩家的平衡难度 */
  @state() private selectedDifficulty: Difficulty = Difficulty.Medium;
  
  /** 是否禁用NPC（非玩家角色），默认为false - 保持游戏的完整体验 */
  @state() private disableNPCs: boolean = false;
  
  /** 机器人数量设置，默认为400个 - 系统支持的最大机器人数量，提供最大挑战 */
  @state() private bots: number = 400;
  
  /** 是否启用无限金币模式，默认为false - 保持游戏的资源管理挑战性 */
  @state() private infiniteGold: boolean = false;
  
  /** 是否启用无限军队模式，默认为false - 保持游戏的人口限制平衡性 */
  @state() private infiniteTroops: boolean = false;
  
  /** 是否启用即时建造模式，默认为false - 保持游戏的建造时间策略性 */
  @state() private instantBuild: boolean = false;
  
  /** 是否使用随机地图，默认为false - 让玩家可以选择特定地图进行游戏 */
  @state() private useRandomMap: boolean = false;
  
  /** 游戏模式设置，默认为自由对战(FFA) - 最经典的单人游戏模式 */
  @state() private gameMode: GameMode = GameMode.FFA;
  
  /** 团队数量配置，默认为2队 - 最基本的团队对战配置（仅在团队模式下有效） */
  @state() private teamCount: TeamCountConfig = 2;

  /** 被禁用的单位类型列表，默认为空数组 - 允许所有单位类型参与游戏 */
  @state() private disabledUnits: UnitType[] = [];

  /** 用户设置管理器实例，用于处理用户偏好设置和游戏配置 */
  private userSettings: UserSettings = new UserSettings();

  /** 
   * 组件连接到DOM时的回调函数
   * 注册键盘事件监听器，用于处理ESC键关闭模态框
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * 组件从DOM断开时的回调函数
   * 清理键盘事件监听器，防止内存泄漏
   */
  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  /**
   * 处理键盘按键事件
   * 监听ESC键以关闭模态框，提供快捷的退出方式
   * @param e 键盘事件对象
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    // 检查是否按下ESC键（键码："Escape"）
    if (e.code === "Escape") {
      e.preventDefault(); // 阻止默认行为
      this.close(); // 关闭模态框
    }
  };

  /**
   * 渲染组件的主要方法
   * 生成完整的单人游戏配置界面，包括：
   * - 地图选择区域（支持分类显示和随机地图）
   * - 难度选择
   * - 游戏模式配置
   * - 各种游戏选项开关
   * - 单位禁用选项
   * - 开始游戏按钮
   * @returns 渲染的HTML模板
   */
  render() {

    return html`
      <o-modal title=${translateText("single_modal.title")}>
        <div class="options-layout">
          <!-- 地图选择区域 -->
          <div class="options-section">
            <div class="option-title">${translateText("map.map")}</div>
            <div class="option-cards flex-col">
              <!-- 遍历地图分类，按类别显示地图选项 -->
              ${Object.entries(mapCategories).map(
                ([categoryKey, maps]) => html`
                  <div class="w-full mb-4">
                    <!-- 地图分类标题 -->
                    <h3
                      class="text-lg font-semibold mb-2 text-center text-gray-300"
                    >
                      ${translateText(`map_categories.${categoryKey}`)}
                    </h3>
                    <!-- 该分类下的地图选项网格 -->
                    <div class="flex flex-row flex-wrap justify-center gap-4">
                      ${maps.map((mapValue) => {
                        // 查找与地图值对应的地图键名
                        // 通过反向查找GameMapType枚举来获取地图的字符串键
                        const mapKey = Object.keys(GameMapType).find(
                          (key) =>
                            GameMapType[key as keyof typeof GameMapType] ===
                            mapValue,
                        );
                        return html`
                          <div
                            @click=${() => this.handleMapSelection(mapValue)}
                          >
                            <!-- 地图显示组件，包含预览图和选中状态 -->
                            <map-display
                              .mapKey=${mapKey}
                              .selected=${
                                // 选中条件：未使用随机地图 且 当前地图等于选中地图
                                !this.useRandomMap && this.selectedMap === mapValue
                              }
                              .translation=${translateText(
                                `map.${mapKey?.toLowerCase()}`,
                              )}
                            ></map-display>
                          </div>
                        `;
                      })}
                    </div>
                  </div>
                `,
              )}
              <!-- 随机地图选项卡 -->
              <div
                class="option-card random-map ${this.useRandomMap
                  ? "selected"
                  : ""}"
                @click=${this.handleRandomMapToggle}
              >
                <div class="option-image">
                  <!-- 随机地图预览图片 -->
                  <img
                    src=${randomMap}
                    alt="Random Map"
                    style="width:100%; aspect-ratio: 4/2; object-fit:cover; border-radius:8px;"
                  />
                </div>
                <div class="option-card-title">
                  ${translateText("map.random")}
                </div>
              </div>
            </div>
          </div>

          <!-- 难度选择区域 -->
          <div class="options-section">
            <div class="option-title">
              ${translateText("difficulty.difficulty")}
            </div>
            <div class="option-cards">
              <!-- 遍历难度枚举，过滤掉数字键，只保留字符串键 -->
              ${Object.entries(Difficulty)
                .filter(([key]) => isNaN(Number(key))) // 过滤掉枚举的数字键
                .map(
                  ([key, value]) => html`
                    <div
                      class="option-card ${this.selectedDifficulty === value
                        ? "selected"
                        : ""}"
                      @click=${() => this.handleDifficultySelection(value)}
                    >
                      <!-- 难度显示组件 -->
                      <difficulty-display
                        .difficultyKey=${key}
                      ></difficulty-display>
                      <p class="option-card-title">
                        ${translateText(`difficulty.${key}`)}
                      </p>
                    </div>
                  `,
                )}
            </div>
          </div>

          <!-- 游戏模式选择区域 -->
          <div class="options-section">
            <div class="option-title">${translateText("host_modal.mode")}</div>
            <div class="option-cards">
              <!-- 自由对战模式选项 -->
              <div
                class="option-card ${this.gameMode === GameMode.FFA
                  ? "selected"
                  : ""}"
                @click=${() => this.handleGameModeSelection(GameMode.FFA)}
              >
                <div class="option-card-title">
                  ${translateText("game_mode.ffa")}
                </div>
              </div>
              <!-- 团队模式选项 -->
              <div
                class="option-card ${this.gameMode === GameMode.Team
                  ? "selected"
                  : ""}"
                @click=${() => this.handleGameModeSelection(GameMode.Team)}
              >
                <div class="option-card-title">
                  ${translateText("game_mode.teams")}
                </div>
              </div>
            </div>
          </div>

          <!-- 团队数量选择区域（仅在团队模式下显示） -->
          ${this.gameMode === GameMode.FFA
            ? "" // FFA模式下不显示团队数量选择
            : html`
                <div class="options-section">
                  <div class="option-title">
                    ${translateText("host_modal.team_count")}
                  </div>
                  <div class="option-cards">
                    <!-- 团队数量选项：包括数字配置(2-7队)和预设配置(Quads/Trios/Duos) -->
                    ${[
                      2, // 2队对战 - 最基本的团队配置
                      3, // 3队混战 - 增加策略复杂性
                      4, // 4队对战 - 平衡的多队竞争
                      5, // 5队混战 - 高复杂度对战
                      6, // 6队大混战 - 极高复杂度
                      7, // 7队超级混战 - 最大团队数量
                      Quads, // 四人小队预设配置
                      Trios, // 三人小队预设配置  
                      Duos   // 双人小队预设配置
                    ].map(
                      (o) => html`
                        <div
                          class="option-card ${this.teamCount === o
                            ? "selected"
                            : ""}"
                          @click=${() => this.handleTeamCountSelection(o)}
                        >
                          <div class="option-card-title">
                            <!-- 根据选项类型显示不同的文本 -->
                            ${typeof o === "string"
                              ? translateText(`public_lobby.teams_${o}`) // 预设配置（如Quads）
                              : translateText(`public_lobby.teams`, { num: o })} <!-- 数字配置 -->
                          </div>
                        </div>
                      `,
                    )}
                  </div>
                </div>
              `}

          <!-- 游戏选项区域 -->
          <div class="options-section">
            <div class="option-title">
              ${translateText("single_modal.options_title")}
            </div>
            <div class="option-cards">
              <!-- 机器人数量滑块控制 -->
              <label for="bots-count" class="option-card">
                <input
                  type="range"
                  id="bots-count"
                  min="0"
                  max="400"
                  step="1"
                  @input=${this.handleBotsChange}
                  @change=${this.handleBotsChange}
                  .value="${String(this.bots)}"
                />
                <div class="option-card-title">
                  <span>${translateText("single_modal.bots")}</span>
                  <!-- 根据机器人数量显示不同文本 -->
                  ${this.bots === 0
                    ? translateText("single_modal.bots_disabled") // 0个机器人时显示"禁用"
                    : this.bots} <!-- 显示具体数量 -->
                </div>
              </label>

              <!-- 禁用NPC选项 -->
              <label
                for="singleplayer-modal-disable-npcs"
                class="option-card ${this.disableNPCs ? "selected" : ""}"
              >
                <div class="checkbox-icon"></div>
                <input
                  type="checkbox"
                  id="singleplayer-modal-disable-npcs"
                  @change=${this.handleDisableNPCsChange}
                  .checked=${this.disableNPCs}
                />
                <div class="option-card-title">
                  ${translateText("single_modal.disable_nations")}
                </div>
              </label>

              <!-- 即时建造选项 -->
              <label
                for="singleplayer-modal-instant-build"
                class="option-card ${this.instantBuild ? "selected" : ""}"
              >
                <div class="checkbox-icon"></div>
                <input
                  type="checkbox"
                  id="singleplayer-modal-instant-build"
                  @change=${this.handleInstantBuildChange}
                  .checked=${this.instantBuild}
                />
                <div class="option-card-title">
                  ${translateText("single_modal.instant_build")}
                </div>
              </label>

              <!-- 无限金币选项 -->
              <label
                for="singleplayer-modal-infinite-gold"
                class="option-card ${this.infiniteGold ? "selected" : ""}"
              >
                <div class="checkbox-icon"></div>
                <input
                  type="checkbox"
                  id="singleplayer-modal-infinite-gold"
                  @change=${this.handleInfiniteGoldChange}
                  .checked=${this.infiniteGold}
                />
                <div class="option-card-title">
                  ${translateText("single_modal.infinite_gold")}
                </div>
              </label>

              <!-- 无限军队选项 -->
              <label
                for="singleplayer-modal-infinite-troops"
                class="option-card ${this.infiniteTroops ? "selected" : ""}"
              >
                <div class="checkbox-icon"></div>
                <input
                  type="checkbox"
                  id="singleplayer-modal-infinite-troops"
                  @change=${this.handleInfiniteTroopsChange}
                  .checked=${this.infiniteTroops}
                />
                <div class="option-card-title">
                  ${translateText("single_modal.infinite_troops")}
                </div>
              </label>
            </div>

            <!-- 分隔线 -->
            <hr
              style="width: 100%; border-top: 1px solid #444; margin: 16px 0;"
            />
            <!-- 单位禁用选项标题 -->
            <div
              style="margin: 8px 0 12px 0; font-weight: bold; color: #ccc; text-align: center;"
            >
              ${translateText("single_modal.enables_title")}
            </div>
            <!-- 单位类型选择网格 -->
            <div
              style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;"
            >
              <!-- 渲染单位类型选项，允许玩家禁用特定单位 -->
              ${renderUnitTypeOptions({
                disabledUnits: this.disabledUnits, // 当前禁用的单位列表
                toggleUnit: this.toggleUnit.bind(this), // 切换单位状态的回调函数
              })}
            </div>
          </div>
        </div>

        <!-- 开始游戏按钮 -->
        <o-button
          title=${translateText("single_modal.start")}
          @click=${this.startGame}
          blockDesktop
        ></o-button>
      </o-modal>
    `;
  }

  /**
   * 创建渲染根节点
   * 返回当前元素作为渲染根，使用Light DOM而非Shadow DOM
   * 这样可以继承父级样式，便于样式管理
   * @returns 当前元素实例
   */
  createRenderRoot() {
    return this; // light DOM
  }

  /**
   * 打开单人游戏模态框
   * 显示模态框并重置随机地图选项为false
   */
  public open() {
    this.modalEl?.open();
    this.useRandomMap = false;
  }

  /**
   * 关闭单人游戏模态框
   * 隐藏模态框界面
   */
  public close() {
    this.modalEl?.close();
  }

  /**
   * 处理随机地图切换
   * 当用户选择随机地图选项时，设置useRandomMap为true
   */
  private handleRandomMapToggle() {
    this.useRandomMap = true;
  }

  /**
   * 处理地图选择
   * 当用户选择特定地图时，更新选中的地图并禁用随机地图选项
   * @param value 选中的地图类型
   */
  private handleMapSelection(value: GameMapType) {
    this.selectedMap = value;
    this.useRandomMap = false;
  }

  /**
   * 处理难度选择
   * 更新游戏难度设置
   * @param value 选中的难度级别
   */
  private handleDifficultySelection(value: Difficulty) {
    this.selectedDifficulty = value;
  }

  /**
   * 处理机器人数量变化
   * 验证输入值的有效性并更新机器人数量
   * @param e 滑块输入事件
   */
  private handleBotsChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    // 验证机器人数量范围：0-400个
    // 0表示禁用机器人，400是系统支持的最大机器人数量
    if (isNaN(value) || value < 0 || value > 400) {
      return;
    }
    this.bots = value;
  }

  /**
   * 处理即时建造选项变化
   * 更新即时建造模式的开关状态
   * @param e 复选框变化事件
   */
  private handleInstantBuildChange(e: Event) {
    this.instantBuild = Boolean((e.target as HTMLInputElement).checked);
  }

  /**
   * 处理无限金币选项变化
   * 更新无限金币模式的开关状态
   * @param e 复选框变化事件
   */
  private handleInfiniteGoldChange(e: Event) {
    this.infiniteGold = Boolean((e.target as HTMLInputElement).checked);
  }

  /**
   * 处理无限军队选项变化
   * 更新无限军队模式的开关状态
   * @param e 复选框变化事件
   */
  private handleInfiniteTroopsChange(e: Event) {
    this.infiniteTroops = Boolean((e.target as HTMLInputElement).checked);
  }

  /**
   * 处理禁用NPC选项变化
   * 更新是否禁用NPC的设置
   * @param e 复选框变化事件
   */
  private handleDisableNPCsChange(e: Event) {
    this.disableNPCs = Boolean((e.target as HTMLInputElement).checked);
  }

  /**
   * 处理游戏模式选择
   * 更新游戏模式设置（FFA或团队模式）
   * @param value 选中的游戏模式
   */
  private handleGameModeSelection(value: GameMode) {
    this.gameMode = value;
  }

  /**
   * 处理团队数量选择
   * 更新团队模式下的队伍数量配置
   * @param value 选中的团队数量配置
   */
  private handleTeamCountSelection(value: TeamCountConfig) {
    this.teamCount = value;
  }

  /**
   * 获取随机地图
   * 从所有可用的地图类型中随机选择一个地图
   * @returns 随机选中的地图类型
   */
  private getRandomMap(): GameMapType {
    const maps = Object.values(GameMapType);
    const randIdx = Math.floor(Math.random() * maps.length);
    return maps[randIdx] as GameMapType;
  }

  /**
   * 切换单位类型的启用/禁用状态
   * 管理禁用单位列表，支持添加或移除特定单位类型
   * @param unit 要切换的单位类型
   * @param checked 是否禁用该单位（true=禁用，false=启用）
   */
  private toggleUnit(unit: UnitType, checked: boolean): void {
    console.log(`Toggling unit type: ${unit} to ${checked}`);
    
    // 根据checked状态更新禁用单位列表
    this.disabledUnits = checked
      ? [...this.disabledUnits, unit] // 如果checked为true，将单位添加到禁用列表
      : this.disabledUnits.filter((u) => u !== unit); // 如果checked为false，从禁用列表中移除该单位
  }

  /**
   * 启动单人游戏
   * 收集所有游戏配置信息，包括：
   * - 地图选择（如果是随机地图则随机选择一个）
   * - 用户名和国旗信息
   * - 游戏模式和难度设置
   * - 各种游戏选项（无限资源、即时建造等）
   * - 禁用的单位类型
   * - 用户的化妆品设置（图案等）
   * 
   * 然后触发join-lobby事件启动游戏，并关闭模态框
   */
  private async startGame() {

    // 如果选择了随机地图，现在随机选择一个具体地图
    if (this.useRandomMap) {
      this.selectedMap = this.getRandomMap();
    }

    // 记录游戏启动信息到控制台
    console.log(
      `Starting single player game with map: ${GameMapType[this.selectedMap as keyof typeof GameMapType]}${this.useRandomMap ? " (Randomly selected)" : ""}`,
    );
    
    // 生成唯一的客户端ID和游戏ID，用于标识本次游戏会话
    const clientID = generateID();
    const gameID = generateID();

    // 获取用户名输入组件，用于读取玩家输入的用户名
    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!usernameInput) {
      console.warn("Username input element not found");
    }

    // 获取国旗输入组件，用于读取玩家选择的国旗
    const flagInput = document.querySelector("flag-input") as FlagInput;
    if (!flagInput) {
      console.warn("Flag input element not found");
    }
    
    // 获取用户选择的图案名称，用于个性化外观设置
    const patternName = this.userSettings.getSelectedPatternName();
    let pattern: string | undefined = undefined;
    
    // 确定要使用的图案，按优先级选择
    if (this.userSettings.getDevOnlyPattern()) {
      // 优先级1：开发者专用图案（如果存在）
      pattern = this.userSettings.getDevOnlyPattern();
    } else if (patternName) {
      // 优先级2：用户从化妆品系统选择的图案
      pattern = (await getCosmetics())?.patterns[patternName]?.pattern;
    }
    // 如果都没有，pattern保持undefined，使用默认外观
    
    // 触发join-lobby自定义事件，传递完整的游戏配置给父组件
    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          clientID: clientID, // 客户端唯一标识
          gameID: gameID,     // 游戏会话唯一标识
          gameStartInfo: {
            gameID: gameID,
            players: [
              {
                clientID,
                username: usernameInput.getCurrentUsername(), // 获取当前用户名
                flag:
                  flagInput.getCurrentFlag() === "xx"
                    ? "" // "xx"是特殊值，表示不显示国旗
                    : flagInput.getCurrentFlag(), // 获取选择的国旗代码
                pattern: pattern, // 用户的个性化图案设置
              },
            ],
            config: {
              // 基础游戏设置
              gameMap: this.selectedMap, // 选择的地图类型
              gameType: GameType.Singleplayer, // 固定为单人游戏类型
              gameMode: this.gameMode, // 游戏模式（FFA自由对战或Team团队模式）
              playerTeams: this.teamCount, // 团队数量配置（仅团队模式有效）
              difficulty: this.selectedDifficulty, // AI难度等级
              
              // NPC和机器人设置
              disableNPCs: this.disableNPCs, // 是否禁用中立NPC单位
              bots: this.bots, // AI机器人数量（0-400）
              
              // 资源和建造设置
              infiniteGold: this.infiniteGold, // 是否启用无限金币模式
              donateGold: true, // 允许向盟友捐赠金币（单人游戏默认开启）
              donateTroops: true, // 允许向盟友捐赠军队（单人游戏默认开启）
              infiniteTroops: this.infiniteTroops, // 是否启用无限人口模式
              instantBuild: this.instantBuild, // 是否启用即时建造模式
              
              // 单位限制设置
              // 处理禁用的单位类型列表，确保数据有效性
              disabledUnits: this.disabledUnits
                .map((u) => Object.values(UnitType).find((ut) => ut === u)) // 验证单位类型是否存在于枚举中
                .filter((ut): ut is UnitType => ut !== undefined), // 过滤掉无效的单位类型，保证类型安全
            },
          },
        } satisfies JoinLobbyEvent, // TypeScript类型检查，确保事件数据符合JoinLobbyEvent接口
        bubbles: true, // 允许事件向上冒泡到父元素
        composed: true, // 允许事件穿越Shadow DOM边界
      }),
    );
    
    // 游戏配置完成，关闭模态框
    this.close();
  }
}
