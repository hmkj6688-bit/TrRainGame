/**
 * 加入私人房间模态框组件
 * 
 * 该文件实现了一个用于加入私人游戏房间的模态对话框组件，主要功能包括：
 * 
 * 主要功能：
 * - 房间ID输入和验证：支持手动输入或从剪贴板粘贴房间ID
 * - URL解析：自动从完整URL中提取房间ID
 * - 房间状态检查：验证房间是否存在、是否活跃
 * - 玩家列表显示：实时显示当前房间内的玩家
 * - 游戏记录查找：支持查找已归档的游戏记录
 * 
 * 技术特性：
 * - 基于Lit Element框架构建的Web组件
 * - 响应式状态管理和UI更新
 * - 键盘快捷键支持（ESC关闭）
 * - 剪贴板API集成
 * - 定时轮询机制更新玩家列表
 * - 多语言支持和国际化
 * 
 * 用户交互：
 * - 支持键盘输入和粘贴操作
 * - 实时反馈和错误提示
 * - 自动格式化和验证输入
 * - 一键加入房间功能
 * 
 * @author OpenFrontIO Team
 * @version 1.0.0
 */

// Lit框架核心模块，用于创建Web组件
import { LitElement, html } from "lit";
// Lit装饰器，用于定义组件属性和状态
import { customElement, query, state } from "lit/decorators.js";
// 国际化工具函数，用于文本翻译
import { translateText } from "../client/Utils";
// 游戏信息和记录的数据结构定义
import { GameInfo, GameRecordSchema } from "../core/Schemas";
// ID生成工具函数
import { generateID } from "../core/Util";
// 服务器配置加载器
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
// 加入房间事件定义
import { JoinLobbyEvent } from "./Main";
// 基础UI组件：按钮
import "./components/baseComponents/Button";
// 基础UI组件：模态框
import "./components/baseComponents/Modal";
// JWT相关工具函数，用于API请求
import { getApiBase } from "./jwt";
/**
 * 加入私人房间模态框组件
 * 
 * 这是一个基于Lit Element的Web组件，用于处理私人游戏房间的加入流程。
 * 组件提供了完整的用户界面和交互逻辑，包括房间ID验证、玩家列表显示等功能。
 */
@customElement("join-private-lobby-modal")
export class JoinPrivateLobbyModal extends LitElement {
  /**
   * 模态框DOM元素引用
   * 用于控制模态框的打开和关闭操作
   */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  /**
   * 房间ID输入框DOM元素引用
   * 用于获取用户输入的房间ID或设置默认值
   */
  @query("#lobbyIdInput") private lobbyIdInput!: HTMLInputElement;

  /**
   * 消息显示状态
   * 用于向用户显示操作结果、错误信息或提示信息
   */
  @state() private message: string = "";

  /**
   * 是否已加入房间的状态标志
   * 控制UI显示逻辑，决定是否显示加入按钮或玩家列表
   */
  @state() private hasJoined = false;

  /**
   * 当前房间内的玩家列表
   * 存储房间内所有玩家的用户名，用于实时显示
   */
  @state() private players: string[] = [];

  /**
   * 玩家列表轮询定时器
   * 用于定期更新房间内的玩家信息，确保数据实时性
   */
  private playersInterval: NodeJS.Timeout | null = null;

  /**
   * 组件连接到DOM时的生命周期回调
   * 注册全局键盘事件监听器，支持ESC键关闭模态框
   */
  connectedCallback() {
    super.connectedCallback();
    // 注册键盘事件监听器，支持快捷键操作
    window.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * 组件从DOM断开时的生命周期回调
   * 清理事件监听器，防止内存泄漏
   */
  disconnectedCallback() {
    // 移除键盘事件监听器
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  /**
   * 键盘事件处理函数
   * 处理ESC键按下事件，提供快速关闭模态框的功能
   * @param e 键盘事件对象
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault(); // 阻止默认行为
      this.close(); // 关闭模态框
    }
  };

  /**
   * 渲染组件UI
   * 构建模态框的完整用户界面，包括输入框、按钮、消息区域和玩家列表
   * @returns 模板字面量，定义组件的HTML结构
   */
  render() {
    return html`
      <!-- 模态框容器，标题支持国际化 -->
      <o-modal title=${translateText("private_lobby.title")}>
        <!-- 房间ID输入区域 -->
        <div class="lobby-id-box">
          <!-- 房间ID输入框，支持键盘输入和占位符文本 -->
          <input
            type="text"
            id="lobbyIdInput"
            placeholder=${translateText("private_lobby.enter_id")}
            @keyup=${this.handleChange}
          />
          <!-- 粘贴按钮，支持从剪贴板粘贴房间ID -->
          <button
            @click=${this.pasteFromClipboard}
            class="lobby-id-paste-button"
          >
            <!-- 粘贴图标SVG -->
            <svg
              class="lobby-id-paste-button-icon"
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 32 32"
              height="18px"
              width="18px"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 15 3 C 13.742188 3 12.847656 3.890625 12.40625 5 L 5 5 L 5 28 L 13 28 L 13 30 L 27 30 L 27 14 L 25 14 L 25 5 L 17.59375 5 C 17.152344 3.890625 16.257813 3 15 3 Z M 15 5 C 15.554688 5 16 5.445313 16 6 L 16 7 L 19 7 L 19 9 L 11 9 L 11 7 L 14 7 L 14 6 C 14 5.445313 14.445313 5 15 5 Z M 7 7 L 9 7 L 9 11 L 21 11 L 21 7 L 23 7 L 23 14 L 13 14 L 13 26 L 7 26 Z M 15 16 L 25 16 L 25 28 L 15 28 Z"
              ></path>
            </svg>
          </button>
        </div>
        
        <!-- 消息显示区域，根据消息内容动态显示/隐藏 -->
        <div class="message-area ${this.message ? "show" : ""}">
          ${this.message}
        </div>
        
        <!-- 选项布局区域 -->
        <div class="options-layout">
          <!-- 玩家列表区域，仅在已加入房间且有玩家时显示 -->
          ${this.hasJoined && this.players.length > 0
            ? html` <div class="options-section">
                <!-- 玩家数量标题，支持单复数形式 -->
                <div class="option-title">
                  ${this.players.length}
                  ${this.players.length === 1
                    ? translateText("private_lobby.player")
                    : translateText("private_lobby.players")}
                </div>

                <!-- 玩家列表显示 -->
                <div class="players-list">
                  ${this.players.map(
                    (player) => html`<span class="player-tag">${player}</span>`,
                  )}
                </div>
              </div>`
            : ""}
        </div>
        
        <!-- 按钮区域 -->
        <div class="flex justify-center">
          <!-- 加入房间按钮，仅在未加入时显示 -->
          ${!this.hasJoined
            ? html` <o-button
                title=${translateText("private_lobby.join_lobby")}
                block
                @click=${this.joinLobby}
              ></o-button>`
            : ""}
        </div>
      </o-modal>
    `;
  }

  /**
   * 创建渲染根节点
   * 返回组件本身作为渲染根，使用Light DOM而非Shadow DOM
   * 这样可以让组件的样式更容易被外部CSS控制
   * @returns 组件实例本身
   */
  createRenderRoot() {
    return this; // light DOM
  }

  /**
   * 打开模态框
   * 如果提供了房间ID，会自动填入并尝试加入房间
   * @param id 可选的房间ID，如果提供则自动加入该房间
   */
  public open(id: string = "") {
    this.modalEl?.open(); // 打开模态框
    if (id) {
      this.setLobbyId(id); // 设置房间ID
      this.joinLobby(); // 自动加入房间
    }
  }

  /**
   * 关闭模态框
   * 清理输入框内容、关闭模态框并停止玩家列表轮询
   */
  public close() {
    this.lobbyIdInput.value = ""; // 清空输入框
    this.modalEl?.close(); // 关闭模态框
    // 清理玩家列表轮询定时器
    if (this.playersInterval) {
      clearInterval(this.playersInterval);
      this.playersInterval = null;
    }
  }

  /**
   * 关闭模态框并离开房间
   * 除了关闭模态框外，还会重置状态并触发离开房间事件
   */
  public closeAndLeave() {
    this.close(); // 关闭模态框
    this.hasJoined = false; // 重置加入状态
    this.message = ""; // 清空消息
    // 触发自定义事件，通知父组件用户离开了房间
    this.dispatchEvent(
      new CustomEvent("leave-lobby", {
        detail: { lobby: this.lobbyIdInput.value },
        bubbles: true, // 事件冒泡
        composed: true, // 跨越Shadow DOM边界
      }),
    );
  }

  /**
   * 从URL中提取房间ID
   * 支持多种URL格式：
   * - 包含#join=参数的URL
   * - 包含join/路径的URL
   * - 普通文本ID
   * @param input 输入的URL或房间ID
   * @returns 提取出的房间ID
   */
  private extractLobbyIdFromUrl(input: string): string {
    if (input.startsWith("http")) {
      // 处理包含#join=参数的URL格式
      if (input.includes("#join=")) {
        const params = new URLSearchParams(input.split("#")[1]);
        return params.get("join") ?? input;
      } 
      // 处理包含join/路径的URL格式
      else if (input.includes("join/")) {
        return input.split("join/")[1];
      } 
      // 其他HTTP URL直接返回
      else {
        return input;
      }
    } else {
      // 非URL格式，直接返回原始输入
      return input;
    }
  }

  /**
   * 设置房间ID到输入框
   * 会先从URL中提取房间ID，然后设置到输入框中
   * @param id 房间ID或包含房间ID的URL
   */
  private setLobbyId(id: string) {
    this.lobbyIdInput.value = this.extractLobbyIdFromUrl(id);
  }

  /**
   * 处理输入框内容变化事件
   * 当用户在输入框中输入内容时，自动提取并设置房间ID
   * @param e 输入事件对象
   */
  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value.trim();
    this.setLobbyId(value); // 设置提取后的房间ID
  }

  /**
   * 从剪贴板粘贴内容
   * 使用Clipboard API读取剪贴板内容并设置到输入框
   * 如果读取失败会在控制台输出错误信息
   */
  private async pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText(); // 读取剪贴板文本
      this.setLobbyId(clipText); // 设置到输入框
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  }

  /**
   * 加入房间的主要逻辑
   * 执行完整的房间加入流程：
   * 1. 首先检查活跃房间
   * 2. 如果不是活跃房间，检查已归档的游戏记录
   * 3. 根据检查结果显示相应的消息和执行相应的操作
   */
  private async joinLobby(): Promise<void> {
    const lobbyId = this.lobbyIdInput.value;
    console.log(`Joining lobby with ID: ${lobbyId}`);
    // 显示检查中的状态消息
    this.message = `${translateText("private_lobby.checking")}`;

    try {
      // 首先检查游戏是否存在于活跃房间中
      const gameExists = await this.checkActiveLobby(lobbyId);
      if (gameExists) return; // 如果是活跃房间，直接返回

      // 如果不是活跃房间，检查已归档的游戏记录
      switch (await this.checkArchivedGame(lobbyId)) {
        case "success":
          return; // 成功找到归档游戏
        case "not_found":
          this.message = `${translateText("private_lobby.not_found")}`;
          return;
        case "version_mismatch":
          this.message = `${translateText("private_lobby.version_mismatch")}`;
          return;
        case "error":
          this.message = `${translateText("private_lobby.error")}`;
          return;
      }
    } catch (error) {
      console.error("Error checking lobby existence:", error);
      this.message = `${translateText("private_lobby.error")}`;
    }
  }

  /**
   * 检查活跃房间
   * 向服务器查询指定房间ID是否存在于活跃游戏中
   * 如果存在，会自动加入房间并开始轮询玩家列表
   * @param lobbyId 房间ID
   * @returns 如果房间存在且成功加入返回true，否则返回false
   */
  private async checkActiveLobby(lobbyId: string): Promise<boolean> {
    // 获取服务器配置
    const config = await getServerConfigFromClient();
    // 构建API请求URL
    const url = `/${config.workerPath(lobbyId)}/api/game/${lobbyId}/exists`;

    // 发送GET请求检查房间是否存在
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const gameInfo = await response.json();

    // 如果房间存在
    if (gameInfo.exists) {
      // 更新UI状态
      this.message = translateText("private_lobby.joined_waiting");
      this.hasJoined = true;

      // 触发加入房间事件，通知父组件
      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobbyId,
            clientID: generateID(), // 生成客户端ID
          } as JoinLobbyEvent,
          bubbles: true, // 事件冒泡
          composed: true, // 跨越Shadow DOM边界
        }),
      );

      // 开始轮询玩家列表，每秒更新一次
      this.playersInterval = setInterval(() => this.pollPlayers(), 1000);
      return true;
    }

    return false;
  }

  /**
   * 检查已归档的游戏记录
   * 查询指定房间ID是否存在于游戏记录归档中，并验证版本兼容性
   * @param lobbyId 房间ID
   * @returns 检查结果：success(成功)、not_found(未找到)、version_mismatch(版本不匹配)、error(错误)
   */
  private async checkArchivedGame(
    lobbyId: string,
  ): Promise<"success" | "not_found" | "version_mismatch" | "error"> {
    // 并行请求游戏归档数据和Git提交信息
    const archivePromise = fetch(`${getApiBase()}/game/${lobbyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const gitCommitPromise = fetch(`/commit.txt`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-cache", // 不缓存，确保获取最新的提交信息
    });

    const [archiveResponse, gitCommitResponse] = await Promise.all([
      archivePromise,
      gitCommitPromise,
    ]);

    // 检查归档响应状态
    if (archiveResponse.status === 404) {
      return "not_found"; // 游戏记录未找到
    }
    if (archiveResponse.status !== 200) {
      return "error"; // 其他错误
    }

    // 解析归档数据
    const archiveData = await archiveResponse.json();
    const parsed = GameRecordSchema.safeParse(archiveData);
    if (!parsed.success) {
      return "version_mismatch"; // 数据格式不匹配，可能是版本问题
    }

    // 获取Git提交文本内容
    let myGitCommit: string;
    if (gitCommitResponse.status === 200) {
      myGitCommit = (await gitCommitResponse.text()).trim();
    } else {
      console.error("Error getting git commit:", gitCommitResponse.status);
      return "error";
    }

    // 版本兼容性检查
    // 允许开发环境(DEV)加入不同版本创建的游戏，用于调试
    if (myGitCommit !== "DEV" && parsed.data.gitCommit !== myGitCommit) {
      console.warn(
        `Git commit hash mismatch for game ${lobbyId}`,
        archiveData.details,
      );
      return "version_mismatch"; // Git提交哈希不匹配
    }

    // 版本兼容，触发加入房间事件（观看回放模式）
    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: lobbyId,
          clientID: generateID(), // 生成客户端ID
          gameRecord: parsed.data, // 传递游戏记录数据
        } as JoinLobbyEvent,
        bubbles: true, // 事件冒泡
        composed: true, // 跨越Shadow DOM边界
      }),
    );

    return "success"; // 成功加入归档游戏
  }

  /**
   * 轮询玩家列表
   * 定期向服务器请求当前房间内的玩家信息并更新UI
   * 如果请求失败会在控制台输出错误信息但不会停止轮询
   */
  private async pollPlayers() {
    try {
      // 获取服务器配置
      const config = await getServerConfigFromClient();
      const lobbyId = this.lobbyIdInput.value;
      // 构建玩家列表API请求URL
      const url = `/${config.workerPath(lobbyId)}/api/game/${lobbyId}/players`;

      // 发送GET请求获取玩家列表
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // 解析响应数据并更新玩家列表状态
      const data = await response.json();
      this.players = data.players || []; // 更新玩家列表，如果没有数据则使用空数组
    } catch (error) {
      // 轮询过程中的错误不应该中断轮询，只记录错误信息
      console.error("Error polling players:", error);
    }
  }
}
