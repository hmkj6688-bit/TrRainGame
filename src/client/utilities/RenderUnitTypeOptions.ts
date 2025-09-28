/**
 * 单位类型渲染选项 - 提供单位类型选择界面的渲染功能
 * 用于生成单位类型复选框选项的HTML模板
 */

// renderUnitTypeOptions.ts
import { html, TemplateResult } from "lit";
import { UnitType } from "../../core/game/Game";
import { translateText } from "../Utils";

/**
 * 单位类型渲染上下文接口
 * 定义渲染单位类型选项所需的数据和回调函数
 */
export interface UnitTypeRenderContext {
  // 被禁用的单位类型数组
  disabledUnits: UnitType[];
  // 切换单位状态的回调函数
  toggleUnit: (unit: UnitType, checked: boolean) => void;
}

// 单位选项配置数组，包含单位类型和对应的翻译键
const unitOptions: { type: UnitType; translationKey: string }[] = [
  { type: UnitType.City, translationKey: "unit_type.city" },
  { type: UnitType.DefensePost, translationKey: "unit_type.defense_post" },
  { type: UnitType.Port, translationKey: "unit_type.port" },
  { type: UnitType.Warship, translationKey: "unit_type.warship" },
  { type: UnitType.MissileSilo, translationKey: "unit_type.missile_silo" },
  { type: UnitType.SAMLauncher, translationKey: "unit_type.sam_launcher" },
  { type: UnitType.AtomBomb, translationKey: "unit_type.atom_bomb" },
  { type: UnitType.HydrogenBomb, translationKey: "unit_type.hydrogen_bomb" },
  { type: UnitType.MIRV, translationKey: "unit_type.mirv" },
  { type: UnitType.Factory, translationKey: "unit_type.factory" },
];

/**
 * 渲染单位类型选项
 * 根据提供的上下文生成单位类型复选框选项的HTML模板数组
 * @param context 包含禁用单位列表和切换函数的渲染上下文
 * @returns 单位类型选项的HTML模板数组
 */
export function renderUnitTypeOptions({
  disabledUnits,
  toggleUnit,
}: UnitTypeRenderContext): TemplateResult[] {
  return unitOptions.map(
    ({ type, translationKey }) => html`
      <label
        class="option-card ${disabledUnits.includes(type) ? "" : "selected"}"
        style="width: 140px;"
      >
        <div class="checkbox-icon"></div>
        <input
          type="checkbox"
          .checked=${disabledUnits.includes(type)}
          @change=${(e: Event) => {
            const checked = (e.target as HTMLInputElement).checked;
            toggleUnit(type, checked);
          }}
        />
        <div class="option-card-title" style="text-align: center;">
          ${translateText(translationKey)}
        </div>
      </label>
    `,
  );
}
