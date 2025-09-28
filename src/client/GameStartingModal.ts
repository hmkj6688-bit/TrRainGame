/**
 * 游戏启动模态框 - 显示游戏加载和启动状态
 * 在游戏初始化过程中向用户显示加载信息和进度
 */

import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";

/**
 * 游戏启动模态框组件
 * 用于在游戏启动过程中显示加载状态和相关信息
 */
@customElement("game-starting-modal")
export class GameStartingModal extends LitElement {
  // 模态框是否可见的状态
  @state()
  isVisible = false;

  // 模态框样式定义
  static styles = css`
    .modal {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(30, 30, 30, 0.7);
      padding: 25px;
      border-radius: 10px;
      z-index: 9999;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      color: white;
      width: 300px;
      text-align: center;
      transition:
        opacity 0.3s ease-in-out,
        visibility 0.3s ease-in-out;
    }

    .modal.visible {
      display: block;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .modal h2 {
      margin-bottom: 15px;
      font-size: 22px;
      color: white;
    }

    .modal p {
      margin-bottom: 20px;
      background-color: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 5px;
    }

    .button-container {
      display: flex;
      justify-content: center;
      gap: 10px;
    }

    .modal button {
      padding: 12px;
      font-size: 16px;
      cursor: pointer;
      background: rgba(255, 100, 100, 0.7);
      color: white;
      border: none;
      border-radius: 5px;
      transition:
        background-color 0.2s ease,
        transform 0.1s ease;
    }

    .modal button:hover {
      background: rgba(255, 100, 100, 0.9);
      transform: translateY(-1px);
    }

    .modal button:active {
      transform: translateY(1px);
    }
  `;

  render() {
    return html`
      <div class="modal ${this.isVisible ? "visible" : ""}">
        <h2>${translateText("game_starting_modal.title")}</h2>
        <p>${translateText("game_starting_modal.desc")}</p>
      </div>
    `;
  }

  show() {
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }
}
