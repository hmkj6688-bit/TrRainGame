/**
 * 新闻按钮组件 - 显示新闻通知按钮，当有新版本时会高亮显示
 * 基于Lit Element构建的Web组件
 */

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import megaphone from "../../../resources/images/Megaphone.svg";
import version from "../../../resources/version.txt";
import { NewsModal } from "../NewsModal";
import { translateText } from "../Utils";

/**
 * 新闻按钮Web组件类
 * 负责显示新闻按钮并处理版本更新通知
 */
@customElement("news-button")
export class NewsButton extends LitElement {
  @property({ type: Boolean }) hidden = false; // 是否隐藏按钮
  @state() private isActive = false; // 是否处于激活状态（有新版本）

  /**
   * 组件连接到DOM时的回调
   * 检查是否有新版本更新
   */
  connectedCallback() {
    super.connectedCallback();
    this.checkForNewVersion();
  }

  /**
   * 检查新版本 - 比较当前版本与本地存储的版本
   * 如果版本不同则激活按钮状态
   */
  private checkForNewVersion() {
    try {
      const lastSeenVersion = localStorage.getItem("version");
      this.isActive = lastSeenVersion !== version;
    } catch (error) {
      // 如果localStorage失败，回退到不显示通知
      this.isActive = false;
    }
  }

  /**
   * 处理按钮点击事件
   * 更新本地存储的版本信息并打开新闻模态框
   */
  private handleClick() {
    localStorage.setItem("version", version);
    this.isActive = false;

    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (newsModal) {
      newsModal.open();
    }
  }

  /**
   * 渲染组件模板
   * @returns HTML模板
   */
  render() {
    return html`
      <div
        class="flex relative ${this.hidden ? "parent-hidden" : ""} ${this
          .isActive
          ? "active"
          : ""}"
      >
        <button
          class="border p-[4px] rounded-lg flex cursor-pointer border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
          @click=${this.handleClick}
        >
          <img
            class="size-[48px] dark:invert"
            src="${megaphone}"
            alt=${translateText("news.title")}
          />
        </button>
      </div>
    `;
  }

  createRenderRoot() {
    return this;
  }
}
