/**
 * 新闻/更新日志模态框组件
 * 
 * 这个组件用于显示应用程序的更新日志和新闻信息。它从changelog.md文件
 * 加载Markdown格式的内容，并在模态框中以格式化的方式展示给用户。
 * 
 * 主要功能：
 * - 显示应用程序的更新日志和版本信息
 * - 支持Markdown格式的内容渲染
 * - 自动转换GitHub链接为可点击的链接
 * - 提供键盘快捷键支持（ESC键关闭）
 * - 响应式设计，适配不同屏幕尺寸
 * 
 * 使用场景：
 * - 应用程序启动时显示最新更新
 * - 用户主动查看版本更新信息
 * - 展示新功能和修复的问题
 * 
 * 技术特点：
 * - 基于Lit框架的Web组件
 * - 使用lit-markdown进行Markdown渲染
 * - 支持国际化文本翻译
 * - 懒加载机制，只在首次打开时加载内容
 */
import { LitElement, css, html } from "lit"; // Lit框架核心模块，用于创建Web组件
import { resolveMarkdown } from "lit-markdown"; // Markdown解析和渲染库
import { customElement, property, query } from "lit/decorators.js"; // Lit装饰器，用于定义组件属性和查询元素
import changelog from "../../resources/changelog.md"; // 更新日志Markdown文件
import { translateText } from "../client/Utils"; // 国际化文本翻译工具函数
import "./components/baseComponents/Button"; // 基础按钮组件
import "./components/baseComponents/Modal"; // 基础模态框组件

@customElement("news-modal") // 注册自定义元素，标签名为"news-modal"
export class NewsModal extends LitElement {
  /** 
   * 模态框元素的引用
   * 通过@query装饰器获取DOM中的o-modal元素，用于控制模态框的打开和关闭
   * 类型定义包含了open()和close()方法，确保类型安全
   */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  /**
   * 组件连接到DOM时的生命周期方法
   * 当组件被添加到DOM树中时自动调用
   * 
   * 主要作用：
   * - 调用父类的connectedCallback方法，确保Lit组件正常初始化
   * - 添加全局键盘事件监听器，支持ESC键关闭模态框
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * 组件从DOM断开时的生命周期方法
   * 当组件从DOM树中移除时自动调用
   * 
   * 主要作用：
   * - 移除全局键盘事件监听器，防止内存泄漏
   * - 调用父类的disconnectedCallback方法，确保Lit组件正常清理
   * 
   * 注意：清理顺序很重要，先清理自定义逻辑，再调用父类方法
   */
  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  /**
   * 键盘事件处理器
   * 处理全局键盘按键事件，提供键盘快捷键支持
   * 
   * @param e 键盘事件对象，包含按键信息
   * 
   * 支持的快捷键：
   * - Escape键：关闭模态框
   * 
   * 实现细节：
   * - 使用箭头函数确保this上下文正确绑定
   * - 阻止默认行为，避免浏览器默认的ESC键行为
   * - 调用close()方法关闭模态框
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault(); // 阻止浏览器默认的ESC键行为
      this.close();
    }
  };

  /** 
   * Markdown内容属性
   * 存储要在模态框中显示的Markdown格式文本内容
   * 
   * 属性特点：
   * - 使用@property装饰器标记为响应式属性
   * - 类型为String，当值改变时会触发组件重新渲染
   * - 默认值为"Loading..."，在内容加载前显示加载提示
   * - 内容来源于changelog.md文件，经过处理后的Markdown文本
   */
  @property({ type: String }) markdown = "Loading...";

  /** 
   * 初始化状态标志
   * 标记组件是否已经完成首次初始化和内容加载
   * 
   * 用途：
   * - 实现懒加载机制，只在首次打开时加载changelog内容
   * - 避免重复加载，提高性能
   * - 确保内容只被处理一次（如GitHub链接转换）
   */
  private initialized: boolean = false;

  /**
   * 组件样式定义
   * 使用CSS-in-JS方式定义组件的样式，确保样式封装和组件化
   * 
   * 样式结构：
   * 1. :host - 组件根元素样式，设置为块级显示
   * 2. .news-container - 新闻内容容器，提供滚动和布局
   * 3. .news-content - 新闻内容区域，设置背景和文本样式
   * 4. .news-content a - 链接样式，包括悬停效果
   * 
   * 设计特点：
   * - 深色主题设计，背景使用半透明黑色
   * - 响应式布局，支持内容溢出时的垂直滚动
   * - 链接使用蓝色系，提供良好的视觉反馈
   * - 圆角设计，提升视觉美观度
   */
  static styles = css`
    :host {
      display: block; /* 设置组件为块级元素 */
    }

    .news-container {
      overflow-y: auto; /* 内容溢出时显示垂直滚动条 */
      padding: 1rem; /* 内边距，提供内容与边界的间距 */
      display: flex; /* 使用Flexbox布局 */
      flex-direction: column; /* 垂直排列子元素 */
      gap: 1.5rem; /* 子元素间距 */
    }

    .news-content {
      color: #ddd; /* 浅灰色文本，适合深色背景 */
      line-height: 1.5; /* 行高，提升文本可读性 */
      background: rgba(0, 0, 0, 0.6); /* 半透明黑色背景 */
      border-radius: 8px; /* 圆角边框 */
      padding: 1rem; /* 内边距 */
    }

    .news-content a {
      color: #4a9eff !important; /* 链接颜色：亮蓝色，使用!important确保优先级 */
      text-decoration: underline !important; /* 下划线装饰 */
      transition: color 0.2s ease; /* 颜色变化过渡动画 */
    }

    .news-content a:hover {
      color: #6fb3ff !important; /* 悬停时的链接颜色：更亮的蓝色 */
    }
  `;

  /**
   * 渲染方法
   * 定义组件的HTML模板结构，使用Lit的html模板字面量
   * 
   * 模板结构：
   * 1. o-modal - 基础模态框组件，设置标题
   * 2. options-layout/options-section - 布局容器
   * 3. news-container - 新闻内容容器
   * 4. news-content - 实际内容区域，渲染Markdown
   * 5. GitHub链接区域 - 提供查看完整发布记录的链接
   * 6. o-button - 关闭按钮
   * 
   * 关键功能：
   * - 使用resolveMarkdown渲染Markdown内容
   * - 支持图片和代码块类名
   * - 国际化文本支持
   * - 响应式布局设计
   * 
   * @returns 渲染的HTML模板
   */
  render() {
    return html`
      <o-modal title=${translateText("news.title")}>
        <div class="options-layout">
          <div class="options-section">
            <div class="news-container">
              <div class="news-content">
                ${resolveMarkdown(this.markdown, {
                  includeImages: true, // 支持图片渲染
                  includeCodeBlockClassNames: true, // 为代码块添加CSS类名
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          ${translateText("news.see_all_releases")}
          <a
            href="https://github.com/openfrontio/OpenFrontIO/releases"
            target="_blank"
            >${translateText("news.github_link")}</a
          >.
        </div>

        <o-button
          title=${translateText("common.close")}
          @click=${this.close}
          blockDesktop
        ></o-button>
      </o-modal>
    `;
  }

  /**
   * 打开模态框的公共方法
   * 显示新闻模态框，并在首次打开时加载和处理changelog内容
   * 
   * 工作流程：
   * 1. 检查是否已初始化，实现懒加载机制
   * 2. 如果未初始化，则：
   *    - 标记为已初始化
   *    - 从changelog.md文件获取内容
   *    - 处理GitHub链接，转换为可点击的Markdown链接
   *    - 更新markdown属性
   * 3. 请求组件更新
   * 4. 打开模态框
   * 
   * GitHub链接处理：
   * - Pull Request链接：转换为 [#PR号](链接) 格式
   * - Compare链接：转换为 [比较版本](链接) 格式
   * 
   * 错误处理：
   * - 如果fetch失败，显示"Failed to load"消息
   * - 使用Promise链式调用确保异步操作的正确执行
   */
  public open() {
    if (!this.initialized) {
      this.initialized = true;
      fetch(changelog) // 获取changelog.md文件内容
        .then((response) => (response.ok ? response.text() : "Failed to load"))
        .then((markdown) =>
          markdown
            // 将GitHub PR链接转换为Markdown链接格式
            .replace(
              /(?<!\()\bhttps:\/\/github\.com\/openfrontio\/OpenFrontIO\/pull\/(\d+)\b/g,
              (_match, prNumber) =>
                `[#${prNumber}](https://github.com/openfrontio/OpenFrontIO/pull/${prNumber})`,
            )
            // 将GitHub比较链接转换为Markdown链接格式
            .replace(
              /(?<!\()\bhttps:\/\/github\.com\/openfrontio\/OpenFrontIO\/compare\/([\w.-]+)\b/g,
              (_match, comparison) =>
                `[${comparison}](https://github.com/openfrontio/OpenFrontIO/compare/${comparison})`,
            ),
        )
        .then((markdown) => (this.markdown = markdown)); // 更新markdown属性
    }
    this.requestUpdate(); // 请求组件重新渲染
    this.modalEl?.open(); // 打开模态框
  }

  /**
   * 关闭模态框的私有方法
   * 隐藏新闻模态框，通常由用户交互触发
   * 
   * 调用场景：
   * - 用户点击关闭按钮
   * - 用户按下ESC键
   * - 其他需要关闭模态框的情况
   * 
   * 实现细节：
   * - 使用可选链操作符(?.)确保modalEl存在时才调用close方法
   * - 避免在modalEl未初始化时出现错误
   */
  private close() {
    this.modalEl?.close(); // 安全地调用模态框的关闭方法
  }
}
