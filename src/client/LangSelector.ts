/**
 * 语言选择器组件
 * 
 * 这是一个基于 Lit 框架的自定义元素，用于管理应用程序的多语言支持。
 * 主要功能包括：
 * 
 * 核心功能：
 * - 语言检测：自动检测浏览器语言并选择最接近的支持语言
 * - 语言切换：提供用户界面供用户选择和切换语言
 * - 语言持久化：将用户选择的语言保存到本地存储
 * - 翻译管理：加载和管理多语言翻译文件
 * - 实时翻译：动态更新页面上所有需要翻译的文本内容
 * 
 * 支持的语言：
 * - 支持30+种语言，包括主要的世界语言
 * - 每种语言包含本地化名称、英文名称和对应的国旗图标
 * - 支持地区变体（如 pt-PT 和 pt-BR）
 * 
 * 技术特点：
 * - 使用 Light DOM 以支持 TailwindCSS 样式
 * - 响应式状态管理，自动更新相关组件
 * - 调试模式支持，便于开发时测试翻译
 * - 智能语言匹配算法，支持语言代码的模糊匹配
 * - 扁平化翻译键管理，支持嵌套的翻译结构
 * 
 * 使用场景：
 * - 多语言网站的语言选择器
 * - 国际化应用的语言管理
 * - 用户设置中的语言偏好配置
 */

// Lit 框架核心模块，提供组件基类和 HTML 模板渲染功能
import { LitElement, html } from "lit";
// Lit 装饰器，用于定义自定义元素和响应式状态属性
import { customElement, state } from "lit/decorators.js";
// 语言选择模态框组件，用于显示语言选择界面
import "./LanguageModal";

// 阿拉伯语翻译文件
import ar from "../../resources/lang/ar.json";
// 保加利亚语翻译文件
import bg from "../../resources/lang/bg.json";
// 孟加拉语翻译文件
import bn from "../../resources/lang/bn.json";
// 捷克语翻译文件
import cs from "../../resources/lang/cs.json";
// 丹麦语翻译文件
import da from "../../resources/lang/da.json";
// 德语翻译文件
import de from "../../resources/lang/de.json";
// 英语翻译文件（默认语言）
import en from "../../resources/lang/en.json";
// 世界语翻译文件
import eo from "../../resources/lang/eo.json";
// 西班牙语翻译文件
import es from "../../resources/lang/es.json";
// 芬兰语翻译文件
import fi from "../../resources/lang/fi.json";
// 法语翻译文件
import fr from "../../resources/lang/fr.json";
// 加利西亚语翻译文件
import gl from "../../resources/lang/gl.json";
// 希伯来语翻译文件
import he from "../../resources/lang/he.json";
// 印地语翻译文件
import hi from "../../resources/lang/hi.json";
// 匈牙利语翻译文件
import hu from "../../resources/lang/hu.json";
// 意大利语翻译文件
import it from "../../resources/lang/it.json";
// 日语翻译文件
import ja from "../../resources/lang/ja.json";
// 韩语翻译文件
import ko from "../../resources/lang/ko.json";
// 荷兰语翻译文件
import nl from "../../resources/lang/nl.json";
// 波兰语翻译文件
import pl from "../../resources/lang/pl.json";
// 巴西葡萄牙语翻译文件
import pt_BR from "../../resources/lang/pt-BR.json";
// 葡萄牙语翻译文件
import pt_PT from "../../resources/lang/pt-PT.json";
// 俄语翻译文件
import ru from "../../resources/lang/ru.json";
// 塞尔维亚-克罗地亚语翻译文件
import sh from "../../resources/lang/sh.json";
// 斯洛伐克语翻译文件
import sk from "../../resources/lang/sk.json";
// 斯洛文尼亚语翻译文件
import sl from "../../resources/lang/sl.json";
// 瑞典语翻译文件
import sv_SE from "../../resources/lang/sv-SE.json";
// 道本语（Toki Pona）翻译文件
import tp from "../../resources/lang/tp.json";
// 土耳其语翻译文件
import tr from "../../resources/lang/tr.json";
// 乌克兰语翻译文件
import uk from "../../resources/lang/uk.json";
// 简体中文翻译文件
import zh_CN from "../../resources/lang/zh-CN.json";

/**
 * 语言选择器组件类
 * 
 * 继承自 LitElement，实现了完整的多语言支持功能。
 * 负责管理应用程序的语言状态、翻译加载和界面更新。
 */
@customElement("lang-selector")
export class LangSelector extends LitElement {
  /**
   * 当前语言的翻译映射表
   * 
   * 存储当前选中语言的所有翻译键值对，采用扁平化结构。
   * 例如：{ "main.title": "游戏标题", "button.start": "开始" }
   * 当语言切换时会重新加载对应语言的翻译内容。
   */
  @state() public translations: Record<string, string> | undefined;
  
  /**
   * 默认语言（英语）的翻译映射表
   * 
   * 作为翻译的后备方案，当当前语言缺少某个翻译键时，
   * 会从默认翻译中获取对应的英文文本，确保界面不会显示未翻译的键名。
   */
  @state() public defaultTranslations: Record<string, string> | undefined;
  
  /**
   * 当前选中的语言代码
   * 
   * 标识当前激活的语言，如 'en'、'zh-CN'、'fr' 等。
   * 默认值为 'en'（英语），会根据浏览器语言和用户设置自动调整。
   */
  @state() public currentLang: string = "en";
  
  /**
   * 可用语言列表
   * 
   * 包含所有可选择的语言信息，每个语言对象包含：
   * - code: 语言代码
   * - native: 语言的本地化名称
   * - en: 语言的英文名称
   * - svg: 对应的国旗图标文件名
   */
  @state() private languageList: any[] = [];
  
  /**
   * 语言选择模态框的显示状态
   * 
   * 控制语言选择模态框的显示和隐藏。
   * 当用户点击语言选择器按钮时设为 true，选择语言或关闭时设为 false。
   */
  @state() private showModal: boolean = false;
  
  /**
   * 调试模式状态
   * 
   * 当启用调试模式时，会在语言列表中显示特殊的调试语言选项，
   * 便于开发者测试翻译功能和识别未翻译的文本。
   */
  @state() private debugMode: boolean = false;

  /**
   * 调试键按下状态
   * 
   * 跟踪 'T' 键的按下状态，用于激活调试模式。
   * 当用户按住 'T' 键时，会在语言列表中显示调试选项。
   */
  private debugKeyPressed: boolean = false;

  /**
   * 语言映射表
   * 
   * 将语言代码映射到对应的翻译文件对象。
   * 支持标准语言代码（如 'en', 'fr'）和地区变体（如 'pt-PT', 'zh-CN'）。
   * 这个映射表是所有多语言功能的基础数据结构。
   */
  private languageMap: Record<string, any> = {
    ar,
    bg,
    bn,
    de,
    en,
    es,
    eo,
    fr,
    it,
    hi,
    hu,
    ja,
    nl,
    pl,
    "pt-PT": pt_PT,
    "pt-BR": pt_BR,
    ru,
    sh,
    tr,
    tp,
    uk,
    cs,
    he,
    da,
    fi,
    "sv-SE": sv_SE,
    "zh-CN": zh_CN,
    ko,
    gl,
    sl,
    sk,
  };

  /**
   * 创建渲染根节点
   * 
   * 重写 LitElement 的默认行为，返回组件本身而不是 Shadow DOM。
   * 这样做的目的是使用 Light DOM，以便 TailwindCSS 的样式类能够正常工作。
   * 
   * @returns {Element} 返回组件本身作为渲染根节点
   */
  createRenderRoot() {
    return this;
  }

  /**
   * 组件连接到 DOM 时的生命周期钩子
   * 
   * 当组件被添加到 DOM 树时自动调用。
   * 主要功能：
   * - 调用父类的连接回调
   * - 设置调试键监听器
   * - 初始化语言系统
   */
  connectedCallback() {
    super.connectedCallback();
    this.setupDebugKey();
    this.initializeLanguage();
  }

  /**
   * 设置调试键监听器
   * 
   * 监听全局的键盘事件，当用户按下或释放 'T' 键时更新调试状态。
   * 调试模式允许开发者查看特殊的调试语言选项，用于测试翻译功能。
   * 
   * 事件处理：
   * - keydown: 'T' 键按下时设置 debugKeyPressed 为 true
   * - keyup: 'T' 键释放时设置 debugKeyPressed 为 false
   */
  private setupDebugKey() {
    window.addEventListener("keydown", (e) => {
      if (e.key?.toLowerCase() === "t") this.debugKeyPressed = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key?.toLowerCase() === "t") this.debugKeyPressed = false;
    });
  }

  /**
   * 获取最接近的支持语言
   * 
   * 根据输入的语言代码，找到最匹配的支持语言。
   * 匹配策略：
   * 1. 精确匹配：如果输入的语言代码完全匹配，直接返回
   * 2. 基础匹配：提取语言代码的前两位（如 'en-US' -> 'en'），查找匹配的语言
   * 3. 优先级排序：如果有多个匹配，优先选择更具体的变体（如 'pt-BR' 优于 'pt'）
   * 4. 默认回退：如果都不匹配，返回默认的英语 'en'
   * 
   * @param {string} lang 输入的语言代码
   * @returns {string} 最匹配的支持语言代码
   */
  private getClosestSupportedLang(lang: string): string {
    if (!lang) return "en";
    if (lang in this.languageMap) return lang;

    const base = lang.slice(0, 2);
    const candidates = Object.keys(this.languageMap).filter((key) =>
      key.startsWith(base),
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.length - a.length); // More specific first
      return candidates[0];
    }

    return "en";
  }

  /**
   * 初始化语言系统
   * 
   * 应用启动时的语言初始化流程：
   * 1. 获取浏览器语言设置
   * 2. 检查本地存储中的用户语言偏好
   * 3. 确定最终使用的语言（优先用户设置，其次浏览器语言）
   * 4. 加载默认语言（英语）作为后备翻译
   * 5. 加载目标语言的翻译内容
   * 6. 设置当前语言状态
   * 7. 加载可用语言列表
   * 8. 应用翻译到页面元素
   * 
   * 这个方法确保了应用在启动时就有完整的多语言支持。
   */
  private async initializeLanguage() {
    const browserLocale = navigator.language;
    const savedLang = localStorage.getItem("lang");
    const userLang = this.getClosestSupportedLang(savedLang ?? browserLocale);

    this.defaultTranslations = this.loadLanguage("en");
    this.translations = this.loadLanguage(userLang);
    this.currentLang = userLang;

    await this.loadLanguageList();
    this.applyTranslation();
  }

  /**
   * 加载指定语言的翻译内容
   * 
   * 根据语言代码从语言映射表中获取对应的翻译文件，
   * 并将嵌套的翻译对象转换为扁平化的键值对结构。
   * 
   * 转换示例：
   * 输入：{ main: { title: "标题", button: { start: "开始" } } }
   * 输出：{ "main.title": "标题", "main.button.start": "开始" }
   * 
   * @param {string} lang 语言代码（如 'en', 'zh-CN', 'fr' 等）
   * @returns {Record<string, string>} 扁平化的翻译键值对
   */
  private loadLanguage(lang: string): Record<string, string> {
    const language = this.languageMap[lang] ?? {};
    const flat = flattenTranslations(language);
    return flat;
  }

  /**
   * 加载可用语言列表
   * 
   * 构建用于语言选择界面的语言列表，包含以下功能：
   * 1. 从所有翻译文件中提取语言信息
   * 2. 处理调试模式的特殊语言选项
   * 3. 按优先级排序语言列表：当前语言 > 英语 > 浏览器语言 > 其他语言
   * 4. 为每种语言提供完整的显示信息（代码、本地名称、英文名称、国旗图标）
   * 
   * 语言列表排序策略：
   * - 当前选中的语言显示在最前面
   * - 英语作为通用语言排在第二位（如果不是当前语言）
   * - 浏览器检测到的语言排在第三位（如果与前两者不同）
   * - 其余语言按英文名称字母顺序排列
   * - 调试语言（如果启用）显示在最后
   * 
   * 错误处理：
   * - 如果语言文件缺少必要信息，会使用语言代码作为默认值
   * - 加载失败时会在控制台输出错误信息，但不会中断应用运行
   */
  private async loadLanguageList() {
    try {
      const data = this.languageMap;
      let list: any[] = [];

      const browserLang = new Intl.Locale(navigator.language).language;

      for (const langCode of Object.keys(data)) {
        const langData = data[langCode].lang;
        if (!langData) continue;

        list.push({
          code: langData.lang_code ?? langCode,
          native: langData.native ?? langCode,
          en: langData.en ?? langCode,
          svg: langData.svg ?? langCode,
        });
      }

      let debugLang: any = null;
      if (this.debugKeyPressed) {
        debugLang = {
          code: "debug",
          native: "Debug",
          en: "Debug",
          svg: "xx",
        };
        this.debugMode = true;
      }

      const currentLangEntry = list.find((l) => l.code === this.currentLang);
      const browserLangEntry =
        browserLang !== this.currentLang && browserLang !== "en"
          ? list.find((l) => l.code === browserLang)
          : undefined;
      const englishEntry =
        this.currentLang !== "en"
          ? list.find((l) => l.code === "en")
          : undefined;

      list = list.filter(
        (l) =>
          l.code !== this.currentLang &&
          l.code !== browserLang &&
          l.code !== "en" &&
          l.code !== "debug",
      );

      list.sort((a, b) => a.en.localeCompare(b.en));

      const finalList: any[] = [];
      if (currentLangEntry) finalList.push(currentLangEntry);
      if (englishEntry) finalList.push(englishEntry);
      if (browserLangEntry) finalList.push(browserLangEntry);
      finalList.push(...list);
      if (debugLang) finalList.push(debugLang);

      this.languageList = finalList;
    } catch (err) {
      console.error("Failed to load language list:", err);
    }
  }

  /**
   * 切换应用语言
   * 
   * 当用户选择新语言时执行的完整切换流程：
   * 1. 将新语言保存到本地存储，确保下次访问时保持用户选择
   * 2. 重新加载新语言的翻译内容
   * 3. 更新当前语言状态
   * 4. 立即应用翻译到页面上的所有元素
   * 5. 关闭语言选择模态框
   * 
   * 这个方法确保了语言切换的即时性和持久性。
   * 
   * @param {string} lang 新选择的语言代码
   */
  private changeLanguage(lang: string) {
    localStorage.setItem("lang", lang);
    this.translations = this.loadLanguage(lang);
    this.currentLang = lang;
    this.applyTranslation();
    this.showModal = false;
  }

  /**
   * 应用翻译到页面元素
   * 
   * 将当前语言的翻译应用到整个应用程序，包括：
   * 
   * 1. 更新页面标题（document.title）
   * 2. 处理带有 data-i18n 属性的 HTML 元素
   * 3. 通知所有相关的自定义组件更新其翻译内容
   * 
   * 支持的组件列表：
   * - 游戏相关：single-player-modal, host-lobby-modal, join-private-lobby-modal
   * - 界面组件：emoji-table, leader-board, build-menu, win-modal
   * - 用户界面：top-bar, player-panel, settings-modal, username-input
   * - 通用组件：o-modal, o-button 等
   * 
   * 翻译处理流程：
   * - 查找页面上所有带有 data-i18n 属性的元素
   * - 获取属性值作为翻译键
   * - 从当前语言翻译中查找对应文本
   * - 如果找不到，从默认语言（英语）中查找
   * - 更新元素的文本内容
   * - 对于未找到的翻译键，在控制台输出警告
   * 
   * 组件更新：
   * - 调用每个相关组件的 requestUpdate() 方法
   * - 触发组件重新渲染以应用新的翻译
   */
  private applyTranslation() {
    const components = [
      "single-player-modal",
      "host-lobby-modal",
      "join-private-lobby-modal",
      "emoji-table",
      "leader-board",
      "build-menu",
      "win-modal",
      "game-starting-modal",
      "top-bar",
      "player-panel",
      "replay-panel",
      "help-modal",
      "settings-modal",
      "username-input",
      "public-lobby",
      "user-setting",
      "o-modal",
      "o-button",
      "territory-patterns-modal",
    ];

    document.title = this.translateText("main.title") ?? document.title;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (key === null) return;
      const text = this.translateText(key);
      if (text === null) {
        console.warn(`Translation key not found: ${key}`);
        return;
      }
      element.textContent = text;
    });

    components.forEach((tag) => {
      document.querySelectorAll(tag).forEach((el) => {
        if (typeof (el as any).requestUpdate === "function") {
          (el as any).requestUpdate();
        }
      });
    });
  }

  /**
   * 翻译文本方法
   * 
   * 这是应用程序的核心翻译方法，提供灵活的文本翻译功能。
   * 
   * 翻译查找策略：
   * 1. 优先从当前语言的翻译中查找
   * 2. 如果当前语言中没有，从默认语言（英语）中查找
   * 3. 如果都没有找到，输出警告并返回原始键名
   * 
   * 参数替换功能：
   * - 支持在翻译文本中使用占位符，如 "Hello {name}!"
   * - 通过 params 参数传入替换值，如 { name: "World" }
   * - 最终输出 "Hello World!"
   * 
   * 使用示例：
   * ```typescript
   * // 简单翻译
   * this.translateText("main.title") // 返回 "游戏标题"
   * 
   * // 带参数的翻译
   * this.translateText("welcome.message", { name: "张三" }) 
   * // 返回 "欢迎你，张三！"
   * ```
   * 
   * @param {string} key 翻译键名，支持点分隔的嵌套结构
   * @param {Record<string, string | number>} params 可选的参数对象，用于替换翻译文本中的占位符
   * @returns {string} 翻译后的文本，如果找不到翻译则返回原始键名
   */
  public translateText(
    key: string,
    params: Record<string, string | number> = {},
  ): string {
    let text: string | undefined;
    if (this.translations && key in this.translations) {
      text = this.translations[key];
    } else if (this.defaultTranslations && key in this.defaultTranslations) {
      text = this.defaultTranslations[key];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    for (const param in params) {
      const value = params[param];
      text = text.replace(`{${param}}`, String(value));
    }

    return text;
  }

  /**
   * 打开语言选择模态框
   * 
   * 当用户点击语言选择器按钮时调用此方法。
   * 主要功能：
   * - 根据当前调试键状态更新调试模式
   * - 显示语言选择模态框
   * - 重新加载语言列表以确保数据最新
   * 
   * 调试模式处理：
   * - 检查用户是否正在按住 'T' 键
   * - 如果是，则启用调试模式并在语言列表中显示调试选项
   */
  private openModal() {
    this.debugMode = this.debugKeyPressed;
    this.showModal = true;
    this.loadLanguageList();
  }

  /**
   * 渲染组件模板
   * 
   * 定义语言选择器的 HTML 结构和样式。
   * 
   * 组件结构：
   * - 外层容器：使用 Flexbox 布局的行容器
   * - 语言选择按钮：显示当前语言信息，包括国旗图标和语言名称
   * - 语言选择模态框：用于显示所有可用语言的选择界面
   * 
   * 按钮设计：
   * - 响应式设计：在不同屏幕尺寸下调整内边距和字体大小
   * - 暗色主题支持：自动适配明暗主题的颜色方案
   * - 悬停效果：鼠标悬停时的颜色变化动画
   * - 无障碍支持：提供适当的 title 属性和语义化结构
   * 
   * 国旗图标：
   * - 使用 SVG 格式的国旗图标，确保清晰度和可缩放性
   * - 统一的尺寸规格（24x16px），保持视觉一致性
   * - 自动根据当前语言加载对应的国旗图标
   * 
   * 语言显示：
   * - 同时显示语言的本地名称和英文名称
   * - 格式：本地名称 (英文名称)，如 "中文 (Chinese)"
   * - 为调试语言提供特殊的显示样式
   * 
   * 模态框集成：
   * - 通过属性绑定传递必要的数据（可见性、语言列表、当前语言）
   * - 监听自定义事件处理用户的语言选择和模态框关闭操作
   * 
   * @returns {TemplateResult} 返回 Lit 模板结果
   */
  render() {
    const currentLang =
      this.languageList.find((l) => l.code === this.currentLang) ??
      (this.currentLang === "debug"
        ? {
            code: "debug",
            native: "Debug",
            en: "Debug",
            svg: "xx",
          }
        : {
            native: "English",
            en: "English",
            svg: "uk_us_flag",
          });

    return html`
      <div class="container__row">
        <button
          id="lang-selector"
          @click=${this.openModal}
          class="text-center appearance-none w-full bg-blue-100 dark:bg-gray-700 hover:bg-blue-200 dark:hover:bg-gray-600 text-blue-900 dark:text-gray-100 p-3 sm:p-4 lg:p-5 font-medium text-sm sm:text-base lg:text-lg rounded-md border-none cursor-pointer transition-colors duration-300 flex items-center justify-center gap-2"
          title="Pick a language!"
        >
          <img
            id="lang-flag"
            class="w-6 h-4"
            src="/flags/${currentLang.svg}.svg"
            alt="flag"
          />
          <span id="lang-name">${currentLang.native} (${currentLang.en})</span>
        </button>
      </div>

      <language-modal
        .visible=${this.showModal}
        .languageList=${this.languageList}
        .currentLang=${this.currentLang}
        @language-selected=${(e: CustomEvent) =>
          this.changeLanguage(e.detail.lang)}
        @close-modal=${() => (this.showModal = false)}
      ></language-modal>
    `;
  }
}

/**
 * 扁平化翻译对象的工具函数
 * 
 * 将嵌套的翻译对象转换为扁平化的键值对结构，便于快速查找和使用。
 * 这个函数是翻译系统的核心工具，确保所有翻译键都能被正确处理。
 * 
 * 转换规则：
 * - 使用点号（.）连接嵌套的键名
 * - 只处理字符串类型的值作为最终翻译文本
 * - 递归处理嵌套的对象结构
 * - 忽略数组和其他非对象类型的值
 * 
 * 转换示例：
 * ```typescript
 * 输入：
 * {
 *   main: {
 *     title: "游戏标题",
 *     buttons: {
 *       start: "开始游戏",
 *       quit: "退出"
 *     }
 *   },
 *   settings: {
 *     language: "语言设置"
 *   }
 * }
 * 
 * 输出：
 * {
 *   "main.title": "游戏标题",
 *   "main.buttons.start": "开始游戏", 
 *   "main.buttons.quit": "退出",
 *   "settings.language": "语言设置"
 * }
 * ```
 * 
 * 错误处理：
 * - 对于未知类型的值，会在控制台输出警告信息
 * - 不会中断处理流程，确保其他有效翻译能正常工作
 * 
 * @param {Record<string, any>} obj 需要扁平化的嵌套翻译对象
 * @param {string} parentKey 父级键名，用于构建完整的键路径
 * @param {Record<string, string>} result 累积的结果对象，存储扁平化后的键值对
 * @returns {Record<string, string>} 扁平化后的翻译键值对对象
 */
function flattenTranslations(
  obj: Record<string, any>,
  parentKey = "",
  result: Record<string, string> = {},
): Record<string, string> {
  for (const key in obj) {
    const value = obj[key];
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenTranslations(value, fullKey, result);
    } else {
      console.warn("Unknown type", typeof value, value);
    }
  }

  return result;
}
