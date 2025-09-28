/**
 * 主客户端文件 - 负责初始化和管理游戏客户端的核心功能
 * 包含客户端类定义、事件处理和用户界面组件的初始化
 */

// 导入版本信息
import version from "../../resources/version.txt";
// 导入API响应类型定义
import { UserMeResponse } from "../core/ApiSchemas";
// 导入事件总线系统
import { EventBus } from "../core/EventBus";
// 导入游戏相关的数据结构
import { GameRecord, GameStartInfo, ID } from "../core/Schemas";
// 导入服务器配置相关
import { ServerConfig } from "../core/configuration/Config";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
// 导入用户设置管理
import { UserSettings } from "../core/game/UserSettings";
// 导入各种模态框和组件
import "./AccountModal";
import { joinLobby } from "./ClientGameRunner";
import "./DarkModeButton";
import { DarkModeButton } from "./DarkModeButton";
import "./FlagInput";
import { FlagInput } from "./FlagInput";
import { FlagInputModal } from "./FlagInputModal";
import { GameStartingModal } from "./GameStartingModal";
import "./GoogleAdElement";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import "./LangSelector";
import { LangSelector } from "./LangSelector";
import { LanguageModal } from "./LanguageModal";
import { NewsModal } from "./NewsModal";
import "./PublicLobby";
import { PublicLobby } from "./PublicLobby";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { TerritoryPatternsModal } from "./TerritoryPatternsModal";
import { TokenLoginModal } from "./TokenLoginModal";
import { SendKickPlayerIntentEvent } from "./Transport";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { UsernameInput } from "./UsernameInput";
// 导入工具函数
import {
  generateCryptoRandomUUID,
  incrementGamesPlayed,
  translateText,
} from "./Utils";
// 导入组件
import "./components/NewsButton";
import { NewsButton } from "./components/NewsButton";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
// 导入JWT认证相关功能
import { discordLogin, getUserMe, isLoggedIn } from "./jwt";
// 导入样式文件
import "./styles.css";

// 全局类型声明 - 扩展Window对象以包含第三方库的类型定义
declare global {
  interface Window {
    // PageOS分析工具的类型定义
    PageOS: {
      session: {
        newPageView: () => void;
      };
    };
    // Ramp广告系统的类型定义
    ramp: {
      que: Array<() => void>;
      passiveMode: boolean;
      spaAddAds: (ads: Array<{ type: string; selectorId: string }>) => void;
      destroyUnits: (adType: string) => void;
      settings?: {
        slots?: any;
      };
      spaNewPage: (url: string) => void;
    };
  }

  // 扩展全局事件映射接口以包含自定义事件
  interface DocumentEventMap {
    "join-lobby": CustomEvent<JoinLobbyEvent>;
    "kick-player": CustomEvent;
  }
}

/**
 * 加入游戏大厅事件的数据结构
 */
export interface JoinLobbyEvent {
  clientID: string; // 客户端ID
  // 多人游戏只有gameID，游戏配置在游戏开始前是未知的
  gameID: string; // 游戏ID
  // 游戏配置只在单人游戏时存在
  gameStartInfo?: GameStartInfo; // 游戏开始信息
  // 游戏记录在回放存档游戏时存在
  gameRecord?: GameRecord; // 游戏记录
}

/**
 * 客户端主类 - 管理游戏客户端的核心功能和用户界面
 */
class Client {
  // 游戏停止函数的引用
  private gameStop: (() => void) | null = null;
  // 事件总线实例，用于组件间通信
  private eventBus: EventBus = new EventBus();

  // 用户界面组件的引用
  private usernameInput: UsernameInput | null = null; // 用户名输入组件
  private flagInput: FlagInput | null = null; // 国旗输入组件
  private darkModeButton: DarkModeButton | null = null; // 暗色模式按钮

  // 各种模态框组件
  private joinModal: JoinPrivateLobbyModal; // 加入私人大厅模态框
  private publicLobby: PublicLobby; // 公共大厅组件
  private userSettings: UserSettings = new UserSettings(); // 用户设置管理
  private patternsModal: TerritoryPatternsModal; // 领土图案模态框
  private tokenLoginModal: TokenLoginModal; // 令牌登录模态框

  constructor() {}

  /**
   * 初始化客户端 - 设置所有UI组件和事件监听器
   */
  initialize(): void {
    // 设置游戏版本显示
    const gameVersion = document.getElementById(
      "game-version",
    ) as HTMLDivElement;
    if (!gameVersion) {
      console.warn("Game version element not found");
    }
    gameVersion.innerText = version;

    // 初始化新闻模态框
    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (!newsModal) {
      console.warn("News modal element not found");
    }
    newsModal instanceof NewsModal;
    
    // 初始化新闻按钮
    const newsButton = document.querySelector("news-button") as NewsButton;
    if (!newsButton) {
      console.warn("News button element not found");
    } else {
      console.log("News button element found");
    }

    // 注释掉以显示新闻按钮
    // newsButton.hidden = true;

    // 初始化语言选择器和语言模态框
    const langSelector = document.querySelector(
      "lang-selector",
    ) as LangSelector;
    const languageModal = document.querySelector(
      "language-modal",
    ) as LanguageModal;
    if (!langSelector) {
      console.warn("Lang selector element not found");
    }
    if (!languageModal) {
      console.warn("Language modal element not found");
    }

    // 初始化国旗输入组件
    this.flagInput = document.querySelector("flag-input") as FlagInput;
    if (!this.flagInput) {
      console.warn("Flag input element not found");
    }

    // 初始化暗色模式按钮
    this.darkModeButton = document.querySelector(
      "dark-mode-button",
    ) as DarkModeButton;
    if (!this.darkModeButton) {
      console.warn("Dark mode button element not found");
    }

    // 初始化用户名输入组件
    this.usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!this.usernameInput) {
      console.warn("Username input element not found");
    }

    this.publicLobby = document.querySelector("public-lobby") as PublicLobby;

    window.addEventListener("beforeunload", () => {
      console.log("Browser is closing");
      if (this.gameStop !== null) {
        this.gameStop();
      }
    });

    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    document.addEventListener("kick-player", this.handleKickPlayer.bind(this));

    const spModal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal;
    spModal instanceof SinglePlayerModal;

    const singlePlayer = document.getElementById("single-player");
    if (singlePlayer === null) throw new Error("Missing single-player");
    singlePlayer.addEventListener("click", () => {
      if (this.usernameInput?.isValid()) {
        spModal.open();
      }
    });

    // const ctModal = document.querySelector("chat-modal") as ChatModal;
    // ctModal instanceof ChatModal;
    // document.getElementById("chat-button").addEventListener("click", () => {
    //   ctModal.open();
    // });

    const hlpModal = document.querySelector("help-modal") as HelpModal;
    hlpModal instanceof HelpModal;
    const helpButton = document.getElementById("help-button");
    if (helpButton === null) throw new Error("Missing help-button");
    helpButton.addEventListener("click", () => {
      hlpModal.open();
    });

    const flagInputModal = document.querySelector(
      "flag-input-modal",
    ) as FlagInputModal;
    flagInputModal instanceof FlagInputModal;
    const flgInput = document.getElementById("flag-input_");
    if (flgInput === null) throw new Error("Missing flag-input_");
    flgInput.addEventListener("click", () => {
      flagInputModal.open();
    });

    this.patternsModal = document.querySelector(
      "territory-patterns-modal",
    ) as TerritoryPatternsModal;
    const patternButton = document.getElementById(
      "territory-patterns-input-preview-button",
    );
    this.patternsModal instanceof TerritoryPatternsModal;
    if (patternButton === null)
      throw new Error("territory-patterns-input-preview-button");
    this.patternsModal.previewButton = patternButton;
    this.patternsModal.refresh();
    patternButton.addEventListener("click", () => {
      this.patternsModal.open();
    });

    this.tokenLoginModal = document.querySelector(
      "token-login",
    ) as TokenLoginModal;
    this.tokenLoginModal instanceof TokenLoginModal;

    const onUserMe = async (userMeResponse: UserMeResponse | false) => {
      document.dispatchEvent(
        new CustomEvent("userMeResponse", {
          detail: userMeResponse,
          bubbles: true,
          cancelable: true,
        }),
      );

      const config = await getServerConfigFromClient();
      if (!hasAllowedFlare(userMeResponse, config)) {
        if (userMeResponse === false) {
          // Login is required
          document.body.innerHTML = `
            <div style="
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
              background-size: cover;
              background-position: center;
            ">
              <div style="
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2em;
                margin: 5em;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
              ">
                <p style="margin-bottom: 1em;">${translateText("auth.login_required")}</p>
                <p style="margin-bottom: 1.5em;">${translateText("auth.redirecting")}</p>
                <div style="width: 100%; height: 8px; background-color: #444; border-radius: 4px; overflow: hidden;">
                  <div style="
                    height: 100%;
                    width: 0%;
                    background-color: #4caf50;
                    animation: fillBar 5s linear forwards;
                  "></div>
                </div>
              </div>
            </div>
            <div class="bg-image"></div>
            <style>
              @keyframes fillBar {
                from { width: 0%; }
                to { width: 100%; }
              }
            </style>
          `;
          setTimeout(discordLogin, 5000);
        } else {
          // Unauthorized
          document.body.innerHTML = `
            <div style="
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
              background-size: cover;
              background-position: center;
            ">
              <div style="
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2em;
                margin: 5em;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
              ">
                <p style="margin-bottom: 1em;">${translateText("auth.not_authorized")}</p>
                <p>${translateText("auth.contact_admin")}</p>
              </div>
            </div>
            <div class="bg-image"></div>
          `;
        }
        return;
      } else if (userMeResponse === false) {
        // Not logged in
        this.patternsModal.onUserMe(null);
      } else {
        // Authorized
        console.log(
          `Your player ID is ${userMeResponse.player.publicId}\n` +
            "Sharing this ID will allow others to view your game history and stats.",
        );
        this.patternsModal.onUserMe(userMeResponse);
      }
    };

    if (isLoggedIn() === false) {
      // Not logged in
      onUserMe(false);
    } else {
      // JWT appears to be valid
      // TODO: Add caching
      getUserMe().then(onUserMe);
    }

    const settingsModal = document.querySelector(
      "user-setting",
    ) as UserSettingModal;
    settingsModal instanceof UserSettingModal;
    document
      .getElementById("settings-button")
      ?.addEventListener("click", () => {
        settingsModal.open();
      });

    const hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    hostModal instanceof HostPrivateLobbyModal;
    const hostLobbyButton = document.getElementById("host-lobby-button");
    if (hostLobbyButton === null) throw new Error("Missing host-lobby-button");
    hostLobbyButton.addEventListener("click", () => {
      if (this.usernameInput?.isValid()) {
        hostModal.open();
        this.publicLobby.leaveLobby();
      }
    });

    this.joinModal = document.querySelector(
      "join-private-lobby-modal",
    ) as JoinPrivateLobbyModal;
    this.joinModal instanceof JoinPrivateLobbyModal;
    const joinPrivateLobbyButton = document.getElementById(
      "join-private-lobby-button",
    );
    if (joinPrivateLobbyButton === null)
      throw new Error("Missing join-private-lobby-button");
    joinPrivateLobbyButton.addEventListener("click", () => {
      if (this.usernameInput?.isValid()) {
        this.joinModal.open();
      }
    });

    if (this.userSettings.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Attempt to join lobby
    this.handleHash();

    const onHashUpdate = () => {
      // Reset the UI to its initial state
      this.joinModal.close();
      if (this.gameStop !== null) {
        this.handleLeaveLobby();
      }

      // Attempt to join lobby
      this.handleHash();
    };

    // Handle browser navigation & manual hash edits
    window.addEventListener("popstate", onHashUpdate);
    window.addEventListener("hashchange", onHashUpdate);

    function updateSliderProgress(slider: HTMLInputElement) {
      const percent =
        ((Number(slider.value) - Number(slider.min)) /
          (Number(slider.max) - Number(slider.min))) *
        100;
      slider.style.setProperty("--progress", `${percent}%`);
    }

    document
      .querySelectorAll<HTMLInputElement>(
        "#bots-count, #private-lobby-bots-count",
      )
      .forEach((slider) => {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      });
  }

  private handleHash() {
    const strip = () =>
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

    const alertAndStrip = (message: string) => {
      alert(message);
      strip();
    };

    const hash = window.location.hash;

    // Decode the hash first to handle encoded characters
    const decodedHash = decodeURIComponent(hash);
    const params = new URLSearchParams(decodedHash.split("?")[1] || "");

    // Handle different hash sections
    if (decodedHash.startsWith("#purchase-completed")) {
      // Parse params after the ?
      const status = params.get("status");

      if (status !== "true") {
        alertAndStrip("purchase failed");
        return;
      }

      const patternName = params.get("pattern");
      if (!patternName) {
        alert("Something went wrong. Please contact support.");
        console.error("purchase-completed but no pattern name");
        return;
      }

      this.userSettings.setSelectedPatternName(patternName);
      const token = params.get("login-token");

      if (token) {
        strip();
        window.addEventListener("beforeunload", () => {
          // The page reloads after token login, so we need to save the pattern name
          // in case it is unset during reload.
          this.userSettings.setSelectedPatternName(patternName);
        });
        this.tokenLoginModal.open(token);
      } else {
        alertAndStrip(`purchase succeeded: ${patternName}`);
        this.patternsModal.refresh();
      }
      return;
    }

    if (decodedHash.startsWith("#token-login")) {
      const token = params.get("token-login");

      if (!token) {
        alertAndStrip(
          `login failed! Please try again later or contact support.`,
        );
        return;
      }

      strip();
      this.tokenLoginModal.open(token);
      return;
    }

    if (decodedHash.startsWith("#join=")) {
      const lobbyId = decodedHash.substring(6); // Remove "#join="
      if (lobbyId && ID.safeParse(lobbyId).success) {
        this.joinModal.open(lobbyId);
        console.log(`joining lobby ${lobbyId}`);
      }
    }
    if (decodedHash.startsWith("#affiliate=")) {
      const affiliateCode = decodedHash.replace("#affiliate=", "");
      strip();
      if (affiliateCode) {
        this.patternsModal.open(affiliateCode);
      }
    }
    if (decodedHash.startsWith("#refresh")) {
      window.location.href = "/";
    }
  }

  private async handleJoinLobby(event: CustomEvent<JoinLobbyEvent>) {
    const lobby = event.detail;
    console.log(`joining lobby ${lobby.gameID}`);
    if (this.gameStop !== null) {
      console.log("joining lobby, stopping existing game");
      this.gameStop();
    }
    const config = await getServerConfigFromClient();

    this.gameStop = joinLobby(
      this.eventBus,
      {
        gameID: lobby.gameID,
        serverConfig: config,
        patternName: this.userSettings.getSelectedPatternName(),
        flag:
          this.flagInput === null || this.flagInput.getCurrentFlag() === "xx"
            ? ""
            : this.flagInput.getCurrentFlag(),
        playerName: this.usernameInput?.getCurrentUsername() ?? "",
        token: getPlayToken(),
        clientID: lobby.clientID,
        gameStartInfo: lobby.gameStartInfo ?? lobby.gameRecord?.info,
        gameRecord: lobby.gameRecord,
      },
      () => {
        console.log("Closing modals");
        document.getElementById("settings-button")?.classList.add("hidden");
        document
          .getElementById("username-validation-error")
          ?.classList.add("hidden");
        [
          "single-player-modal",
          "host-lobby-modal",
          "join-private-lobby-modal",
          "game-starting-modal",
          "game-top-bar",
          "help-modal",
          "user-setting",
          "territory-patterns-modal",
          "language-modal",
          "news-modal",
          "flag-input-modal",
          "account-button",
          "token-login",
        ].forEach((tag) => {
          const modal = document.querySelector(tag) as HTMLElement & {
            close?: () => void;
            isModalOpen?: boolean;
          };
          if (modal?.close) {
            modal.close();
          } else if ("isModalOpen" in modal) {
            modal.isModalOpen = false;
          }
        });
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // show when the game loads
        const startingModal = document.querySelector(
          "game-starting-modal",
        ) as GameStartingModal;
        startingModal instanceof GameStartingModal;
        startingModal.show();
      },
      () => {
        this.joinModal.close();
        this.publicLobby.stop();
        incrementGamesPlayed();

        try {
          window.PageOS.session.newPageView();
        } catch (e) {
          console.error("Error calling newPageView", e);
        }

        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // Ensure there's a homepage entry in history before adding the lobby entry
        if (window.location.hash === "" || window.location.hash === "#") {
          history.pushState(null, "", window.location.origin + "#refresh");
        }
        history.pushState(null, "", `#join=${lobby.gameID}`);
      },
    );
  }

  private async handleLeaveLobby(/* event: CustomEvent */) {
    if (this.gameStop === null) {
      return;
    }
    console.log("leaving lobby, cancelling game");
    this.gameStop();
    this.gameStop = null;
    this.publicLobby.leaveLobby();
  }

  private handleKickPlayer(event: CustomEvent) {
    const { target } = event.detail;

    // Forward to eventBus if available
    if (this.eventBus) {
      this.eventBus.emit(new SendKickPlayerIntentEvent(target));
    }
  }
}

// Initialize the client when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Client().initialize();
});

// WARNING: DO NOT EXPOSE THIS ID
function getPlayToken(): string {
  const result = isLoggedIn();
  if (result !== false) return result.token;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentID(): string {
  const result = isLoggedIn();
  if (result !== false) return result.claims.sub;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromCookie(): string {
  const COOKIE_NAME = "player_persistent_id";

  // Try to get existing cookie
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=").map((c) => c.trim());
    if (cookieName === COOKIE_NAME) {
      return cookieValue;
    }
  }

  // If no cookie exists, create new ID and set cookie
  const newID = generateCryptoRandomUUID();
  document.cookie = [
    `${COOKIE_NAME}=${newID}`,
    `max-age=${5 * 365 * 24 * 60 * 60}`, // 5 years
    "path=/",
    "SameSite=Strict",
    "Secure",
  ].join(";");

  return newID;
}

function hasAllowedFlare(
  userMeResponse: UserMeResponse | false,
  config: ServerConfig,
) {
  const allowed = config.allowedFlares();
  if (allowed === undefined) return true;
  if (userMeResponse === false) return false;
  const flares = userMeResponse.player.flares;
  if (flares === undefined) return false;
  return allowed.length === 0 || allowed.some((f) => flares.includes(f));
}
