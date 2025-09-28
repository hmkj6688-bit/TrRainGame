/**
 * 用户名输入组件 - 处理用户名的输入、验证和存储
 * 提供用户名输入框、验证功能和本地存储管理
 */

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  validateUsername,
} from "../core/validations/username";

// 本地存储中用户名的键名
const usernameKey: string = "username";

/**
 * 用户名输入组件
 * 提供用户名输入、验证、存储和自动生成功能
 */
@customElement("username-input")
export class UsernameInput extends LitElement {
  // 当前用户名状态
  @state() private username: string = "";
  // 验证错误信息属性
  @property({ type: String }) validationError: string = "";
  // 用户名是否有效的私有标志
  private _isValid: boolean = true;
  // 用户设置实例
  private userSettings: UserSettings = new UserSettings();

  // 移除静态样式，因为我们使用Tailwind CSS

  /**
   * 创建渲染根 - 禁用Shadow DOM以允许Tailwind类生效
   * @returns 当前元素实例
   */
  createRenderRoot() {
    // 禁用shadow DOM以允许Tailwind类工作
    return this;
  }

  /**
   * 获取当前用户名
   * @returns 当前用户名字符串
   */
  public getCurrentUsername(): string {
    return this.username;
  }

  /**
   * 组件连接到DOM时的回调
   * 加载存储的用户名并分发用户名事件
   */
  connectedCallback() {
    super.connectedCallback();
    this.username = this.getStoredUsername();
    this.dispatchUsernameEvent();
  }

  /**
   * 渲染用户名输入框
   * @returns 输入框的HTML模板
   */
  render() {
    return html`
      <input
        type="text"
        .value=${this.username}
        @input=${this.handleChange}
        @change=${this.handleChange}
        placeholder="${translateText("username.enter_username")}"
        maxlength="${MAX_USERNAME_LENGTH}"
        class="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-300/60 dark:bg-gray-700 dark:text-white"
      />
      ${this.validationError
        ? html`<div
            id="username-validation-error"
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-red-600 border-red-600 dark:bg-gray-700 dark:text-red-300 dark:border-red-300"
          >
            ${this.validationError}
          </div>`
        : null}
    `;
  }

  /**
   * 处理输入变化事件
   * @param e 输入事件对象
   */
  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const result = validateUsername(this.username);
    this._isValid = result.isValid;
    if (result.isValid) {
      this.storeUsername(this.username);
      this.validationError = "";
    } else {
      this.validationError = result.error ?? "";
    }
  }

  /**
   * 获取存储的用户名
   * @returns 存储的用户名或新生成的用户名
   */
  private getStoredUsername(): string {
    const storedUsername = localStorage.getItem(usernameKey);
    if (storedUsername) {
      return storedUsername;
    }
    return this.generateNewUsername();
  }

  /**
   * 存储用户名到本地存储
   * @param username 要存储的用户名
   */
  private storeUsername(username: string) {
    if (username) {
      localStorage.setItem(usernameKey, username);
    }
  }

  private dispatchUsernameEvent() {
    this.dispatchEvent(
      new CustomEvent("username-change", {
        detail: { username: this.username },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private generateNewUsername(): string {
    const newUsername = "Anon" + this.uuidToThreeDigits();
    this.storeUsername(newUsername);
    return newUsername;
  }

  private uuidToThreeDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const threeDigits = decimal % 1000n;
    return threeDigits.toString().padStart(3, "0");
  }

  public isValid(): boolean {
    return this._isValid;
  }
}
