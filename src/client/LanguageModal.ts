/**
 * 语言选择模态框组件
 * 
 * 这是一个基于 Lit 框架的自定义元素，用于显示语言选择界面。
 * 主要功能包括：
 * - 显示可用语言列表，支持国旗图标和本地化名称
 * - 响应式设计，适配不同屏幕尺寸
 * - 键盘快捷键支持（ESC 键关闭）
 * - 暗色主题适配
 * - 当前选中语言高亮显示
 * - 特殊调试语言的彩虹动画效果
 * 
 * 使用场景：
 * - 用户首次访问时的语言选择
 * - 设置页面中的语言切换
 * - 多语言应用的语言管理
 * 
 * 技术特点：
 * - 使用 Light DOM 以支持 TailwindCSS 样式
 * - 事件驱动的组件通信
 * - 防止页面滚动的模态框行为
 * - 国际化文本支持
 */

// Lit 框架核心模块，提供组件基类和模板渲染功能
import { LitElement, html } from "lit";
// Lit 装饰器，用于定义自定义元素和响应式属性
import { customElement, property } from "lit/decorators.js";
// 工具函数，用于文本国际化翻译
import { translateText } from "../client/Utils";

/**
 * 语言选择模态框组件类
 * 
 * 继承自 LitElement，实现了一个功能完整的语言选择界面。
 * 支持多语言显示、键盘操作、响应式设计等特性。
 */
@customElement("language-modal")
export class LanguageModal extends LitElement {
  /**
   * 模态框可见性状态
   * 
   * 控制模态框的显示和隐藏，当为 true 时显示模态框，
   * 同时会阻止页面滚动以提供更好的用户体验。
   */
  @property({ type: Boolean }) visible = false;
  
  /**
   * 可用语言列表
   * 
   * 包含所有可选择的语言信息，每个语言对象通常包含：
   * - code: 语言代码（如 'en', 'zh', 'fr' 等）
   * - native: 语言的本地化名称（如 '中文', 'English', 'Français'）
   * - en: 语言的英文名称
   * - svg: 对应的国旗图标文件名
   */
  @property({ type: Array }) languageList: any[] = [];
  
  /**
   * 当前选中的语言代码
   * 
   * 用于标识当前激活的语言，会在语言列表中高亮显示对应项。
   * 默认值为 'en'（英语）。
   */
  @property({ type: String }) currentLang = "en";

  /**
   * 创建渲染根节点
   * 
   * 重写 LitElement 的默认行为，返回组件本身而不是 Shadow DOM。
   * 这样做的目的是使用 Light DOM，以便 TailwindCSS 的样式类能够正常工作。
   * 
   * @returns {Element} 返回组件本身作为渲染根节点
   */
  createRenderRoot() {
    return this; // Use Light DOM for TailwindCSS classes
  }

  /**
   * 关闭模态框的私有方法
   * 
   * 通过派发自定义事件通知父组件关闭模态框。
   * 使用箭头函数确保 this 绑定正确。
   * 
   * 事件特性：
   * - bubbles: true - 允许事件冒泡
   * - composed: true - 允许事件穿越 Shadow DOM 边界
   */
  private close = () => {
    this.dispatchEvent(
      new CustomEvent("close-modal", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  /**
   * 属性更新后的生命周期钩子
   * 
   * 当组件的响应式属性发生变化时自动调用。
   * 主要用于处理 visible 属性变化时的副作用：
   * - 当模态框显示时，禁用页面滚动以防止背景内容滚动
   * - 当模态框隐藏时，恢复页面滚动功能
   * 
   * @param {Map<string, unknown>} changedProps 发生变化的属性映射
   */
  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("visible")) {
      if (this.visible) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    }
  }

  /**
   * 组件连接到 DOM 时的生命周期钩子
   * 
   * 当组件被添加到 DOM 树时自动调用。
   * 主要功能：
   * - 调用父类的 connectedCallback 方法
   * - 添加全局键盘事件监听器，支持 ESC 键关闭模态框
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * 组件从 DOM 断开时的生命周期钩子
   * 
   * 当组件从 DOM 树中移除时自动调用。
   * 主要功能：
   * - 移除全局键盘事件监听器，防止内存泄漏
   * - 恢复页面滚动功能，确保页面状态正常
   * - 调用父类的 disconnectedCallback 方法进行清理
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
    document.body.style.overflow = "auto";
  }

  /**
   * 键盘事件处理器
   * 
   * 处理全局键盘事件，主要用于支持键盘快捷键操作。
   * 当前支持的快捷键：
   * - ESC 键：关闭模态框
   * 
   * 使用箭头函数确保 this 绑定正确，便于在事件监听器中使用。
   * 
   * @param {KeyboardEvent} e 键盘事件对象
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  /**
   * 语言选择处理器
   * 
   * 当用户点击某个语言选项时调用，通过派发自定义事件
   * 将选中的语言代码传递给父组件。
   * 
   * 事件详情：
   * - 事件名：'language-selected'
   * - 事件数据：{ lang: string } - 选中的语言代码
   * - bubbles: true - 允许事件冒泡
   * - composed: true - 允许事件穿越 Shadow DOM 边界
   * 
   * @param {string} lang 选中的语言代码
   */
  private selectLanguage = (lang: string) => {
    this.dispatchEvent(
      new CustomEvent("language-selected", {
        detail: { lang },
        bubbles: true,
        composed: true,
      }),
    );
  };

  /**
   * 渲染组件模板
   * 
   * 定义组件的 HTML 结构和样式。当 visible 为 false 时返回 null，
   * 实现条件渲染以优化性能。
   * 
   * 模板结构：
   * - 外层遮罩层：半透明黑色背景，居中显示
   * - 模态框容器：带有背景模糊效果的深色容器
   * - 头部区域：显示标题和关闭按钮
   * - 内容区域：可滚动的语言列表
   * 
   * 样式特点：
   * - 响应式设计，适配不同屏幕尺寸
   * - 暗色主题，支持背景模糊效果
   * - 语言按钮支持多种状态：普通、选中、调试模式
   * - 调试语言具有特殊的彩虹渐变动画效果
   * 
   * @returns {TemplateResult | null} 返回模板结果或 null
   */
  render() {
    if (!this.visible) return null;

    return html`
      <aside
        class="fixed p-4 z-[1000] inset-0 bg-black/50 overflow-y-auto flex items-center justify-center"
      >
        <div
          class="bg-gray-800/80 dark:bg-gray-900/90 backdrop-blur-md rounded-lg min-w-[340px] max-w-[480px] w-full"
        >
          <header
            class="relative rounded-t-md text-lg bg-black/60 dark:bg-black/80 text-center text-white px-6 py-4 pr-10"
          >
            ${translateText("select_lang.title")}
            <div
              class="cursor-pointer absolute right-4 top-4 font-bold hover:text-gray-300"
              @click=${this.close}
            >
              ✕
            </div>
          </header>

          <section
            class="relative text-white dark:text-gray-100 p-6 max-h-[60dvh] overflow-y-auto"
          >
            ${this.languageList.map((lang) => {
              const isActive = this.currentLang === lang.code;
              const isDebug = lang.code === "debug";

              let buttonClasses =
                "w-full flex items-center gap-2 p-2 mb-2 rounded-md transition-colors duration-300 border";

              if (isDebug) {
                buttonClasses +=
                  " animate-pulse font-bold text-white border-2 border-dashed border-cyan-400 shadow-lg shadow-cyan-400/25 bg-gradient-to-r from-red-600 via-yellow-600 via-green-600 via-blue-600 to-purple-600";
              } else if (isActive) {
                buttonClasses +=
                  " bg-gray-400 dark:bg-gray-500 border-gray-300 dark:border-gray-400 text-black dark:text-white";
              } else {
                buttonClasses +=
                  " bg-gray-600 dark:bg-gray-700 border-gray-500 dark:border-gray-600 text-white dark:text-gray-100 hover:bg-gray-500 dark:hover:bg-gray-600";
              }

              return html`
                <button
                  class="${buttonClasses}"
                  @click=${() => this.selectLanguage(lang.code)}
                >
                  <img
                    src="/flags/${lang.svg}.svg"
                    class="w-6 h-4 object-contain"
                    alt="${lang.code}"
                  />
                  <span>${lang.native} (${lang.en})</span>
                </button>
              `;
            })}
          </section>
        </div>
      </aside>
    `;
  }
}
