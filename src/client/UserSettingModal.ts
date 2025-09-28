/**
 * 用户设置模态框 - 提供游戏设置界面的完整功能
 * 包括基础设置、快捷键绑定、主题切换、游戏选项等功能
 * 支持设置的持久化存储和实时更新
 */

import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import "./components/baseComponents/setting/SettingKeybind";
import { SettingKeybind } from "./components/baseComponents/setting/SettingKeybind";
import "./components/baseComponents/setting/SettingNumber";
import "./components/baseComponents/setting/SettingSlider";
import "./components/baseComponents/setting/SettingToggle";

/**
 * 用户设置模态框组件 - 管理游戏的所有用户配置选项
 * 提供基础设置和快捷键绑定两个主要功能模块
 */
@customElement("user-setting")
export class UserSettingModal extends LitElement {
  /** 用户设置管理器 - 处理设置的读取、保存和应用 */
  private userSettings: UserSettings = new UserSettings();

  /** 当前设置模式 - 控制显示基础设置还是快捷键设置 */
  @state() private settingsMode: "basic" | "keybinds" = "basic";
  
  /** 快捷键绑定映射 - 存储用户自定义的快捷键配置 */
  @state() private keybinds: Record<string, string> = {};

  /** 按键序列 - 用于检测彩蛋触发的按键组合 */
  @state() private keySequence: string[] = [];
  
  /** 彩蛋设置显示状态 - 控制是否显示隐藏的彩蛋设置选项 */
  @state() private showEasterEggSettings = false;

  /**
   * 组件连接回调 - 当组件被添加到DOM时执行
   * 初始化键盘事件监听器并加载保存的快捷键设置
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);

    // 从本地存储加载已保存的快捷键绑定
    const savedKeybinds = localStorage.getItem("settings.keybinds");
    if (savedKeybinds) {
      try {
        this.keybinds = JSON.parse(savedKeybinds);
      } catch (e) {
        console.warn("Invalid keybinds JSON:", e);
      }
    }
  }

  /** 模态框元素引用 - 用于控制模态框的打开和关闭 */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
    isModalOpen: boolean;
  };

  /**
   * 创建渲染根 - 返回当前元素作为渲染根
   * 这样可以直接在当前元素上应用样式，而不是创建Shadow DOM
   */
  createRenderRoot() {
    return this;
  }

  /**
   * 组件断开回调 - 当组件从DOM中移除时执行
   * 清理事件监听器并恢复页面滚动
   */
  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
    document.body.style.overflow = "auto";
  }

  /**
   * 键盘按下事件处理器 - 处理快捷键和彩蛋触发
   * @param e 键盘事件对象
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    // 只在模态框打开且未显示彩蛋设置时处理按键
    if (!this.modalEl?.isModalOpen || this.showEasterEggSettings) return;

    // ESC键关闭模态框
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }

    // 记录按键序列用于彩蛋检测
    const key = e.key.toLowerCase();
    const nextSequence = [...this.keySequence, key].slice(-4);
    this.keySequence = nextSequence;

    // 检测"evan"按键序列触发彩蛋
    if (nextSequence.join("") === "evan") {
      this.triggerEasterEgg();
      this.keySequence = [];
    }
  };

  /**
   * 触发彩蛋 - 显示隐藏的设置选项和提示信息
   */
  private triggerEasterEgg() {
    console.log("🪺 Setting~ unlocked by EVAN combo!");
    this.showEasterEggSettings = true;
    
    // 显示彩蛋发现提示
    const popup = document.createElement("div");
    popup.className = "easter-egg-popup";
    popup.textContent = "🎉 You found a secret setting!";
    document.body.appendChild(popup);

    // 5秒后自动移除提示
    setTimeout(() => {
      popup.remove();
    }, 5000);
  }

  /**
   * 切换深色模式 - 启用或禁用深色主题
   * @param e 包含切换状态的自定义事件
   */
  toggleDarkMode(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;

    if (typeof enabled !== "boolean") {
      console.warn("Unexpected toggle event payload", e);
      return;
    }

    // 保存深色模式设置
    this.userSettings.set("settings.darkMode", enabled);

    // 应用或移除深色模式CSS类
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 触发深色模式变更事件
    this.dispatchEvent(
      new CustomEvent("dark-mode-changed", {
        detail: { darkMode: enabled },
        bubbles: true,
        composed: true,
      }),
    );

    console.log("🌙 Dark Mode:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换表情符号显示 - 控制游戏中是否显示表情符号
   * @param e 包含切换状态的自定义事件
   */
  private toggleEmojis(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.emojis", enabled);
    console.log("🤡 Emojis:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换警报框显示 - 控制是否显示游戏警报边框
   * @param e 包含切换状态的自定义事件
   */
  private toggleAlertFrame(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.alertFrame", enabled);
    console.log("🚨 Alert frame:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换特效层显示 - 控制是否显示游戏特殊效果
   * @param e 包含切换状态的自定义事件
   */
  private toggleFxLayer(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.specialEffects", enabled);
    console.log("💥 Special effects:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换建筑精灵显示 - 控制是否显示建筑物的精灵图像
   * @param e 包含切换状态的自定义事件
   */
  private toggleStructureSprites(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.structureSprites", enabled);
    console.log("🏠 Structure sprites:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换匿名名称显示 - 控制是否隐藏玩家真实姓名
   * @param e 包含切换状态的自定义事件
   */
  private toggleAnonymousNames(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.anonymousNames", enabled);
    console.log("🙈 Anonymous Names:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换大厅ID可见性 - 控制是否隐藏游戏大厅ID
   * @param e 包含切换状态的自定义事件
   */
  private toggleLobbyIdVisibility(e: CustomEvent<{ checked: boolean }>) {
    const hideIds = e.detail?.checked;
    if (typeof hideIds !== "boolean") return;

    // 注意：这里反转值，因为checked=hide的逻辑
    this.userSettings.set("settings.lobbyIdVisibility", !hideIds);
    console.log("👁️ Hidden Lobby IDs:", hideIds ? "ON" : "OFF");
  }

  /**
   * 切换左键打开菜单 - 控制左键点击是否打开上下文菜单
   * @param e 包含切换状态的自定义事件
   */
  private toggleLeftClickOpensMenu(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.leftClickOpensMenu", enabled);
    console.log("🖱️ Left Click Opens Menu:", enabled ? "ON" : "OFF");

    this.requestUpdate();
  }

  /**
   * 攻击比例滑块处理器 - 设置默认攻击部队比例
   * @param e 包含滑块值的自定义事件
   */
  private sliderAttackRatio(e: CustomEvent<{ value: number }>) {
    const value = e.detail?.value;
    if (typeof value === "number") {
      const ratio = value / 100;
      localStorage.setItem("settings.attackRatio", ratio.toString());
    } else {
      console.warn("Slider event missing detail.value", e);
    }
  }

  /**
   * 部队比例滑块处理器 - 设置默认部队分配比例
   * @param e 包含滑块值的自定义事件
   */
  private sliderTroopRatio(e: CustomEvent<{ value: number }>) {
    const value = e.detail?.value;
    if (typeof value === "number") {
      const ratio = value / 100;
      localStorage.setItem("settings.troopRatio", ratio.toString());
    } else {
      console.warn("Slider event missing detail.value", e);
    }
  }

  /**
   * 切换领土图案显示 - 控制是否显示领土的图案纹理
   * @param e 包含切换状态的自定义事件
   */
  private toggleTerritoryPatterns(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.territoryPatterns", enabled);
    console.log("🏳️ Territory Patterns:", enabled ? "ON" : "OFF");
  }

  /**
   * 切换性能覆盖层显示 - 控制是否显示性能监控信息
   * @param e 包含切换状态的自定义事件
   */
  private togglePerformanceOverlay(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.performanceOverlay", enabled);
  }

  /**
   * 快捷键绑定变更处理器 - 处理用户自定义快捷键的更改
   * @param e 包含动作和键值的自定义事件
   */
  private handleKeybindChange(
    e: CustomEvent<{ action: string; value: string }>,
  ) {
    const { action, value } = e.detail;
    const prevValue = this.keybinds[action] ?? "";

    // 检查是否与其他动作的快捷键冲突
    const values = Object.entries(this.keybinds)
      .filter(([k]) => k !== action)
      .map(([, v]) => v);
    
    if (values.includes(value) && value !== "Null") {
      // 显示冲突提示
      const popup = document.createElement("div");
      popup.className = "setting-popup";
      popup.textContent = `The key "${value}" is already assigned to another action.`;
      document.body.appendChild(popup);
      
      // 恢复之前的值
      const element = this.renderRoot.querySelector(
        `setting-keybind[action="${action}"]`,
      ) as SettingKeybind;
      if (element) {
        element.value = prevValue;
        element.requestUpdate();
      }
      return;
    }
    
    // 保存新的快捷键绑定
    this.keybinds = { ...this.keybinds, [action]: value };
    localStorage.setItem("settings.keybinds", JSON.stringify(this.keybinds));
  }

  /**
   * 主渲染方法 - 渲染用户设置模态框的完整界面
   * 包含基本设置和快捷键设置两个标签页
   * @returns 包含模态框结构的HTML模板
   */
  render() {
    return html`
      <o-modal title="${translateText("user_setting.title")}">
        <div class="modal-overlay">
          <div class="modal-content user-setting-modal">
            <!-- 标签页切换按钮 -->
            <div class="flex mb-4 w-full justify-center">
              <button
                class="w-1/2 text-center px-3 py-1 rounded-l 
      ${this.settingsMode === "basic"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400"}"
                @click=${() => (this.settingsMode = "basic")}
              >
                ${translateText("user_setting.tab_basic")}
              </button>
              <button
                class="w-1/2 text-center px-3 py-1 rounded-r 
      ${this.settingsMode === "keybinds"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400"}"
                @click=${() => (this.settingsMode = "keybinds")}
              >
                ${translateText("user_setting.tab_keybinds")}
              </button>
            </div>

            <!-- 设置内容区域 -->
            <div class="settings-list">
              ${this.settingsMode === "basic"
                ? this.renderBasicSettings()
                : this.renderKeybindSettings()}
            </div>
          </div>
        </div>
      </o-modal>
    `;
  }

  /**
   * 渲染基本设置页面 - 包含所有游戏基础配置选项
   * 包括界面设置、游戏效果设置、显示设置等
   * @returns 基本设置页面的HTML模板
   */
  private renderBasicSettings() {
    return html`
      <!-- 🌙 深色模式切换 -->
      <setting-toggle
        label="${translateText("user_setting.dark_mode_label")}"
        description="${translateText("user_setting.dark_mode_desc")}"
        id="dark-mode-toggle"
        .checked=${this.userSettings.darkMode()}
        @change=${(e: CustomEvent<{ checked: boolean }>) =>
          this.toggleDarkMode(e)}
      ></setting-toggle>

      <!-- 😊 表情符号显示 -->
      <setting-toggle
        label="${translateText("user_setting.emojis_label")}"
        description="${translateText("user_setting.emojis_desc")}"
        id="emoji-toggle"
        .checked=${this.userSettings.emojis()}
        @change=${this.toggleEmojis}
      ></setting-toggle>

      <!-- 🚨 警告边框显示 -->
      <setting-toggle
        label="${translateText("user_setting.alert_frame_label")}"
        description="${translateText("user_setting.alert_frame_desc")}"
        id="alert-frame-toggle"
        .checked=${this.userSettings.alertFrame()}
        @change=${this.toggleAlertFrame}
      ></setting-toggle>

      <!-- 💥 特效层显示 -->
      <setting-toggle
        label="${translateText("user_setting.special_effects_label")}"
        description="${translateText("user_setting.special_effects_desc")}"
        id="special-effect-toggle"
        .checked=${this.userSettings.fxLayer()}
        @change=${this.toggleFxLayer}
      ></setting-toggle>

      <!-- 🏠 建筑精灵显示 -->
      <setting-toggle
        label="${translateText("user_setting.structure_sprites_label")}"
        description="${translateText("user_setting.structure_sprites_desc")}"
        id="structure_sprites-toggle"
        .checked=${this.userSettings.structureSprites()}
        @change=${this.toggleStructureSprites}
      ></setting-toggle>

      <!-- 🖱️ 左键菜单设置 -->
      <setting-toggle
        label="${translateText("user_setting.left_click_label")}"
        description="${translateText("user_setting.left_click_desc")}"
        id="left-click-toggle"
        .checked=${this.userSettings.leftClickOpensMenu()}
        @change=${this.toggleLeftClickOpensMenu}
      ></setting-toggle>

      <!-- 🙈 匿名玩家名称 -->
      <setting-toggle
        label="${translateText("user_setting.anonymous_names_label")}"
        description="${translateText("user_setting.anonymous_names_desc")}"
        id="anonymous-names-toggle"
        .checked=${this.userSettings.anonymousNames()}
        @change=${this.toggleAnonymousNames}
      ></setting-toggle>

      <!-- 👁️ 房间ID可见性 -->
      <setting-toggle
        label="${translateText("user_setting.lobby_id_visibility_label")}"
        description="${translateText("user_setting.lobby_id_visibility_desc")}"
        id="lobby-id-visibility-toggle"
        .checked=${!this.userSettings.get("settings.lobbyIdVisibility", true)}
        @change=${this.toggleLobbyIdVisibility}
      ></setting-toggle>

      <!-- 🏳️ 领土图案显示 -->
      <setting-toggle
        label="${translateText("user_setting.territory_patterns_label")}"
        description="${translateText("user_setting.territory_patterns_desc")}"
        id="territory-patterns-toggle"
        .checked=${this.userSettings.territoryPatterns()}
        @change=${this.toggleTerritoryPatterns}
      ></setting-toggle>

      <!-- 📱 性能覆盖层 -->
      <setting-toggle
        label="${translateText("user_setting.performance_overlay_label")}"
        description="${translateText("user_setting.performance_overlay_desc")}"
        id="performance-overlay-toggle"
        .checked=${this.userSettings.performanceOverlay()}
        @change=${this.togglePerformanceOverlay}
      ></setting-toggle>

      <!-- ⚔️ 攻击比例设置 -->
      <setting-slider
        label="${translateText("user_setting.attack_ratio_label")}"
        description="${translateText("user_setting.attack_ratio_desc")}"
        min="1"
        max="100"
        .value=${Number(localStorage.getItem("settings.attackRatio") ?? "0.5") *
        100}
        @change=${this.sliderAttackRatio}
      ></setting-slider>

      <!-- 彩蛋设置区域 - 仅在触发彩蛋后显示 -->
      ${this.showEasterEggSettings
        ? html`
            <!-- 🎯 彩蛋：写作速度设置 -->
            <setting-slider
              label="${translateText(
                "user_setting.easter_writing_speed_label",
              )}"
              description="${translateText(
                "user_setting.easter_writing_speed_desc",
              )}"
              min="0"
              max="100"
              value="40"
              easter="true"
              @change=${(e: CustomEvent) => {
                const value = e.detail?.value;
                if (value !== undefined) {
                  console.log("Changed:", value);
                } else {
                  console.warn("Slider event missing detail.value", e);
                }
              }}
            ></setting-slider>

            <!-- 🐛 彩蛋：Bug数量设置 -->
            <setting-number
              label="${translateText("user_setting.easter_bug_count_label")}"
              description="${translateText(
                "user_setting.easter_bug_count_desc",
              )}"
              value="100"
              min="0"
              max="1000"
              easter="true"
              @change=${(e: CustomEvent) => {
                const value = e.detail?.value;
                if (value !== undefined) {
                  console.log("Changed:", value);
                } else {
                  console.warn("Slider event missing detail.value", e);
                }
              }}
            ></setting-number>
          `
        : null}
    `;
  }

  /**
   * 渲染快捷键设置页面 - 包含所有游戏操作的快捷键配置
   * 按功能分组显示：视图选项、攻击比例控制、攻击快捷键、缩放控制、相机移动等
   * @returns 快捷键设置页面的HTML模板
   */
  private renderKeybindSettings() {
    return html`
      <!-- 视图选项分组 -->
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.view_options")}
      </div>

      <!-- 切换视图快捷键 -->
      <setting-keybind
        action="toggleView"
        label=${translateText("user_setting.toggle_view")}
        description=${translateText("user_setting.toggle_view_desc")}
        defaultKey="Space"
        .value=${this.keybinds["toggleView"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 攻击比例控制分组 -->
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.attack_ratio_controls")}
      </div>

      <!-- 降低攻击比例快捷键 -->
      <setting-keybind
        action="attackRatioDown"
        label=${translateText("user_setting.attack_ratio_down")}
        description=${translateText("user_setting.attack_ratio_down_desc")}
        defaultKey="Digit1"
        .value=${this.keybinds["attackRatioDown"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 提高攻击比例快捷键 -->
      <setting-keybind
        action="attackRatioUp"
        label=${translateText("user_setting.attack_ratio_up")}
        description=${translateText("user_setting.attack_ratio_up_desc")}
        defaultKey="Digit2"
        .value=${this.keybinds["attackRatioUp"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 攻击快捷键分组 -->
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.attack_keybinds")}
      </div>

      <!-- 船只攻击快捷键 -->
      <setting-keybind
        action="boatAttack"
        label=${translateText("user_setting.boat_attack")}
        description=${translateText("user_setting.boat_attack_desc")}
        defaultKey="KeyB"
        .value=${this.keybinds["boatAttack"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 地面攻击快捷键 -->
      <setting-keybind
        action="groundAttack"
        label=${translateText("user_setting.ground_attack")}
        description=${translateText("user_setting.ground_attack_desc")}
        defaultKey="KeyG"
        .value=${this.keybinds["groundAttack"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 缩放控制分组 -->
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.zoom_controls")}
      </div>

      <!-- 缩小快捷键 -->
      <setting-keybind
        action="zoomOut"
        label=${translateText("user_setting.zoom_out")}
        description=${translateText("user_setting.zoom_out_desc")}
        defaultKey="KeyQ"
        .value=${this.keybinds["zoomOut"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 放大快捷键 -->
      <setting-keybind
        action="zoomIn"
        label=${translateText("user_setting.zoom_in")}
        description=${translateText("user_setting.zoom_in_desc")}
        defaultKey="KeyE"
        .value=${this.keybinds["zoomIn"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 相机移动分组 -->
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.camera_movement")}
      </div>

      <!-- 居中相机快捷键 -->
      <setting-keybind
        action="centerCamera"
        label=${translateText("user_setting.center_camera")}
        description=${translateText("user_setting.center_camera_desc")}
        defaultKey="KeyC"
        .value=${this.keybinds["centerCamera"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 向上移动快捷键 -->
      <setting-keybind
        action="moveUp"
        label=${translateText("user_setting.move_up")}
        description=${translateText("user_setting.move_up_desc")}
        defaultKey="KeyW"
        .value=${this.keybinds["moveUp"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 向左移动快捷键 -->
      <setting-keybind
        action="moveLeft"
        label=${translateText("user_setting.move_left")}
        description=${translateText("user_setting.move_left_desc")}
        defaultKey="KeyA"
        .value=${this.keybinds["moveLeft"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 向下移动快捷键 -->
      <setting-keybind
        action="moveDown"
        label=${translateText("user_setting.move_down")}
        description=${translateText("user_setting.move_down_desc")}
        defaultKey="KeyS"
        .value=${this.keybinds["moveDown"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <!-- 向右移动快捷键 -->
      <setting-keybind
        action="moveRight"
        label=${translateText("user_setting.move_right")}
        description=${translateText("user_setting.move_right_desc")}
        defaultKey="KeyD"
        .value=${this.keybinds["moveRight"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>
    `;
  }

  /**
   * 打开设置模态框 - 显示用户设置界面
   * 调用模态框元素的open方法来显示设置面板
   */
  public open() {
    this.modalEl.open();
  }

  /**
   * 关闭设置模态框 - 隐藏用户设置界面
   * 调用模态框元素的close方法来隐藏设置面板
   */
  public close() {
    this.modalEl.close();
  }
}
