/**
 * 领土图案模态框组件
 * 
 * 该文件定义了一个基于Lit框架的Web组件，用于管理和选择游戏中的领土图案。
 * 主要功能包括：
 * - 显示可用的领土图案网格
 * - 处理图案的选择和购买
 * - 支持联盟代码过滤图案
 * - 管理用户的图案偏好设置
 * - 提供图案预览功能
 * 
 * 组件与用户设置、化妆品系统和API集成，支持国际化文本显示。
 */
import type { TemplateResult } from "lit";
import { html, LitElement, render } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { UserMeResponse } from "../core/ApiSchemas";
import { Pattern } from "../core/CosmeticSchemas";
import { UserSettings } from "../core/game/UserSettings";
import "./components/Difficulties";
import "./components/PatternButton";
import { renderPatternPreview } from "./components/PatternButton";
import { fetchPatterns, handlePurchase } from "./Cosmetics";
import { translateText } from "./Utils";

/**
 * 领土图案模态框组件类
 * 
 * 继承自LitElement，实现了一个用于管理游戏领土图案的模态框组件。
 * 该组件负责图案的展示、选择、购买和用户偏好管理。
 */
@customElement("territory-patterns-modal")
export class TerritoryPatternsModal extends LitElement {
  /** 模态框DOM元素的引用，用于控制模态框的打开和关闭 */
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  /** 图案预览按钮的DOM元素引用，用于渲染选中图案的预览 */
  public previewButton: HTMLElement | null = null;

  /** 当前选中的图案，使用@state装饰器实现响应式更新 */
  @state() private selectedPattern: Pattern | null;

  /** 存储所有可用图案的映射表，键为图案名称，值为图案对象 */
  private patterns: Map<string, Pattern> = new Map();

  /** 用户设置管理器，用于保存和读取用户的图案偏好 */
  private userSettings: UserSettings = new UserSettings();

  /** 标识模态框是否处于活跃状态 */
  private isActive = false;

  /** 联盟代码，用于过滤特定联盟的图案，null表示显示所有公共图案 */
  private affiliateCode: string | null = null;

  /**
   * 构造函数
   * 初始化组件实例
   */
  constructor() {
    super();
  }

  /**
   * 处理用户信息更新事件
   * 
   * 当用户登录状态或信息发生变化时调用此方法：
   * 1. 如果用户未登录，清除选中的图案
   * 2. 获取用户可用的图案列表
   * 3. 恢复用户之前选择的图案偏好
   * 4. 刷新界面显示
   * 
   * @param userMeResponse 用户信息响应，null表示用户未登录
   */
  async onUserMe(userMeResponse: UserMeResponse | null) {
    if (userMeResponse === null) {
      this.userSettings.setSelectedPatternName(undefined);
      this.selectedPattern = null;
    }
    this.patterns = await fetchPatterns(userMeResponse);
    const storedPatternName = this.userSettings.getSelectedPatternName();
    if (storedPatternName) {
      this.selectedPattern = this.patterns.get(storedPatternName) ?? null;
    }
    this.refresh();
  }

  /**
   * 创建渲染根元素
   * 
   * 重写父类方法，直接使用当前元素作为渲染根，
   * 而不是创建Shadow DOM，便于样式继承。
   * 
   * @returns 返回当前元素作为渲染根
   */
  createRenderRoot() {
    return this;
  }

  /**
   * 渲染图案网格
   * 
   * 根据当前的联盟代码过滤并渲染可用的图案按钮：
   * 1. 如果没有联盟代码，显示所有公共图案和默认图案
   * 2. 如果有联盟代码，只显示匹配的联盟图案
   * 3. 为每个图案创建可交互的按钮组件
   * 
   * @returns 返回图案网格的HTML模板
   */
  private renderPatternGrid(): TemplateResult {
    const buttons: TemplateResult[] = [];
    for (const [name, pattern] of this.patterns) {
      if (this.affiliateCode === null) {
        if (pattern.affiliateCode !== null && pattern.product !== null) {
          // 有联盟代码的图案默认不对外销售
          continue;
        }
      } else {
        if (pattern.affiliateCode !== this.affiliateCode) {
          continue;
        }
      }

      buttons.push(html`
        <pattern-button
          .pattern=${pattern}
          .onSelect=${(p: Pattern | null) => this.selectPattern(p)}
          .onPurchase=${(p: Pattern) => handlePurchase(p)}
        ></pattern-button>
      `);
    }

    return html`
      <div
        class="flex flex-wrap gap-4 p-2"
        style="justify-content: center; align-items: flex-start;"
      >
        ${this.affiliateCode === null
          ? html`
              <pattern-button
                .pattern=${null}
                .onSelect=${(p: Pattern | null) => this.selectPattern(null)}
              ></pattern-button>
            `
          : html``}
        ${buttons}
      </div>
    `;
  }

  /**
   * 渲染组件的主要方法
   * 
   * 根据组件的活跃状态渲染模态框：
   * - 如果组件未激活，返回空模板
   * - 如果组件激活，渲染包含图案网格的模态框
   * 
   * @returns 返回Lit模板结果
   */
  render() {
    if (!this.isActive) return html``;
    return html`
      <o-modal
        id="territoryPatternsModal"
        title="${translateText("territory_patterns.title")}"
      >
        ${this.renderPatternGrid()}
      </o-modal>
    `;
  }

  /**
   * 打开领土图案模态框
   * 
   * 激活组件并显示模态框：
   * 1. 设置组件为活跃状态
   * 2. 保存联盟代码用于图案过滤
   * 3. 刷新界面以显示最新内容
   * 
   * @param affiliateCode 可选的联盟代码，用于过滤特定联盟的图案
   */
  public async open(affiliateCode?: string) {
    this.isActive = true;
    this.affiliateCode = affiliateCode ?? null;
    await this.refresh();
  }

  /**
   * 关闭领土图案模态框
   * 
   * 清理状态并关闭模态框：
   * 1. 设置组件为非活跃状态
   * 2. 清除联盟代码
   * 3. 关闭模态框界面
   */
  public close() {
    this.isActive = false;
    this.affiliateCode = null;
    this.modalEl?.close();
  }

  /**
   * 选择图案
   * 
   * 处理用户选择图案的操作：
   * 1. 保存用户的图案选择到本地设置
   * 2. 更新当前选中的图案
   * 3. 刷新界面显示
   * 4. 关闭模态框
   * 
   * @param pattern 选中的图案对象，null表示选择默认图案
   */
  private selectPattern(pattern: Pattern | null) {
    this.userSettings.setSelectedPatternName(pattern?.name);
    this.selectedPattern = pattern;
    this.refresh();
    this.close();
  }

  /**
   * 刷新组件显示
   * 
   * 更新图案预览和模态框状态：
   * 1. 渲染当前选中图案的预览
   * 2. 触发组件更新
   * 3. 等待DOM更新完成后打开模态框
   * 4. 将预览内容渲染到预览按钮中
   * 
   * 该方法确保界面状态与数据状态保持同步。
   */
  public async refresh() {
    // 生成图案预览
    const preview = renderPatternPreview(
      this.selectedPattern?.pattern ?? null,
      48,
      48,
    );
    this.requestUpdate();

    // 等待DOM更新完成，确保o-modal元素可用
    await this.updateComplete;

    // 现在modalEl应该可用了
    if (this.modalEl) {
      this.modalEl.open();
    } else {
      console.warn("modalEl is still null after updateComplete");
    }
    // 将预览渲染到预览按钮中
    if (this.previewButton === null) return;
    render(preview, this.previewButton);
    this.requestUpdate();
  }
}
