/**
 * 令牌登录模态框组件
 * 
 * 该文件定义了一个基于Lit框架的Web组件，用于处理用户通过令牌进行登录的流程。
 * 主要功能包括：
 * - 显示登录进度和状态信息
 * - 自动重试登录机制
 * - 登录成功后的用户反馈
 * - 登录失败的错误处理
 * 
 * 组件使用JWT令牌进行身份验证，支持国际化文本显示。
 */
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import "./components/Difficulties";
import "./components/PatternButton";
import { tokenLogin } from "./jwt";
import { translateText } from "./Utils";

/**
 * 令牌登录模态框组件类
 * 
 * 继承自LitElement，实现了一个用于处理令牌登录的模态框组件。
 * 该组件管理登录状态、重试机制和用户界面更新。
 */
@customElement("token-login")
export class TokenLoginModal extends LitElement {
  /** 模态框DOM元素的引用，用于控制模态框的打开和关闭 */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  /** 标识当前是否正在尝试登录，防止并发登录请求 */
  private isAttemptingLogin = false;

  /** 重试定时器，用于定期尝试登录 */
  private retryInterval: NodeJS.Timeout | undefined = undefined;

  /** 用于登录的JWT令牌 */
  private token: string | null = null;

  /** 登录成功后获取的用户邮箱地址 */
  private email: string | null = null;

  /** 登录尝试次数计数器，用于限制重试次数 */
  private attemptCount = 0;

  /**
   * 构造函数
   * 初始化组件实例
   */
  constructor() {
    super();
  }

  /**
   * 渲染组件的主要方法
   * 
   * 根据当前登录状态渲染不同的界面内容：
   * - 如果已获取到邮箱，显示登录成功界面
   * - 否则显示登录进行中界面
   * 
   * @returns 返回Lit模板结果
   */
  render() {
    return html`
      <o-modal
        id="token-login-modal"
        title="${translateText("token_login_modal.title")}"
      >
        ${this.email ? this.loginSuccess(this.email) : this.loggingIn()}
      </o-modal>
    `;
  }

  /**
   * 渲染登录进行中的界面
   * 
   * 显示登录正在进行的提示信息
   * 
   * @returns 返回登录进行中的HTML模板
   */
  private loggingIn() {
    return html` <p>${translateText("token_login_modal.logging_in")}</p> `;
  }

  /**
   * 渲染登录成功的界面
   * 
   * 显示登录成功的消息，包含用户的邮箱地址
   * 
   * @param email 登录成功的用户邮箱地址
   * @returns 返回登录成功的HTML模板
   */
  private loginSuccess(email: string) {
    return html`<p>
      ${translateText("token_login_modal.success", {
        email,
      })}
    </p> `;
  }

  /**
   * 打开令牌登录模态框
   * 
   * 使用提供的令牌开始登录流程：
   * 1. 保存令牌到实例变量
   * 2. 打开模态框界面
   * 3. 启动定时重试机制，每3秒尝试一次登录
   * 
   * @param token JWT令牌字符串，用于身份验证
   */
  public async open(token: string) {
    this.token = token;
    this.modalEl?.open();
    this.retryInterval = setInterval(() => this.tryLogin(), 3000);
  }

  /**
   * 关闭令牌登录模态框
   * 
   * 清理所有相关状态和资源：
   * 1. 清空令牌
   * 2. 停止重试定时器
   * 3. 重置尝试计数器
   * 4. 关闭模态框界面
   * 5. 重置登录状态标志
   */
  public close() {
    this.token = null;
    clearInterval(this.retryInterval);
    this.attemptCount = 0;
    this.modalEl?.close();
    this.isAttemptingLogin = false;
  }

  /**
   * 尝试使用令牌进行登录
   * 
   * 该方法实现了登录的核心逻辑，包括：
   * 1. 防止并发登录请求
   * 2. 限制最大重试次数（3次）
   * 3. 调用tokenLogin API进行身份验证
   * 4. 处理登录成功和失败的情况
   * 5. 在登录成功后自动关闭模态框并刷新页面
   * 
   * 登录失败超过3次后会自动关闭模态框并显示错误提示。
   * 登录成功后会停止重试定时器，显示成功消息1秒后关闭模态框并刷新页面。
   */
  private async tryLogin() {
    // 防止并发登录请求
    if (this.isAttemptingLogin) {
      return;
    }
    // 检查是否超过最大重试次数
    if (this.attemptCount > 3) {
      this.close();
      alert("Login failed. Please try again later.");
      return;
    }
    // 增加尝试计数并设置登录状态
    this.attemptCount++;
    this.isAttemptingLogin = true;
    // 检查令牌是否存在
    if (this.token === null) {
      this.close();
      return;
    }
    try {
      // 调用登录API
      this.email = await tokenLogin(this.token);
      if (!this.email) {
        return;
      }
      // 登录成功，停止重试定时器
      clearInterval(this.retryInterval);
      // 延迟1秒后关闭模态框并刷新页面
      setTimeout(() => {
        this.close();
        window.location.reload();
      }, 1000);
      // 触发界面更新以显示成功消息
      this.requestUpdate();
    } catch (e) {
      // 记录登录错误
      console.error(e);
    } finally {
      // 重置登录状态标志
      this.isAttemptingLogin = false;
    }
  }
}
