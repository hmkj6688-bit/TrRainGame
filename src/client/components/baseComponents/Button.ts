/**
 * 基础按钮组件 - 可重用的按钮Web组件
 * 支持多种样式变体和国际化文本显示
 */

import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { translateText } from "../../Utils";

/**
 * 按钮组件类
 * 提供可配置的按钮样式和文本显示功能
 */
@customElement("o-button")
export class OButton extends LitElement {
  @property({ type: String }) title = ""; // 按钮标题文本
  @property({ type: String }) translationKey = ""; // 翻译键，用于国际化
  @property({ type: Boolean }) secondary = false; // 是否为次要按钮样式
  @property({ type: Boolean }) block = false; // 是否为块级按钮（全宽）
  @property({ type: Boolean }) blockDesktop = false; // 桌面端是否为块级按钮
  @property({ type: Boolean }) disable = false; // 是否禁用按钮

  /**
   * 创建渲染根节点
   * 返回组件本身以使用全局样式
   */
  createRenderRoot() {
    return this;
  }

  /**
   * 渲染按钮组件
   * @returns HTML模板
   */
  render() {
    return html`
      <button
        class=${classMap({
          "c-button": true,
          "c-button--block": this.block,
          "c-button--blockDesktop": this.blockDesktop,
          "c-button--secondary": this.secondary,
          "c-button--disabled": this.disable,
        })}
        ?disabled=${this.disable}
      >
        ${`${this.translationKey}` === ""
          ? `${this.title}` // 使用直接标题文本
          : `${translateText(this.translationKey)}`} 
      </button>
    `;
  }
}
