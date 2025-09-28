/**
 * 工具函数集合 - 包含游戏客户端使用的各种实用工具函数
 * 包括数字格式化、时间渲染、UUID生成、文本翻译等功能
 */

import IntlMessageFormat from "intl-messageformat";
import { MessageType } from "../core/game/Game";
import { LangSelector } from "./LangSelector";

/**
 * 渲染持续时间 - 将秒数转换为可读的时间格式
 * @param totalSeconds 总秒数
 * @returns 格式化的时间字符串 (例如: "5min 30s")
 */
export function renderDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let time = "";
  if (minutes > 0) time += `${minutes}min `;
  time += `${seconds}s`;
  return time.trim();
}

/**
 * 渲染部队数量 - 将部队数量格式化显示
 * @param troops 部队数量
 * @returns 格式化的部队数量字符串
 */
export function renderTroops(troops: number): string {
  return renderNumber(troops / 10);
}

/**
 * 渲染数字 - 将大数字格式化为可读形式 (K, M等单位)
 * @param num 要格式化的数字
 * @param fixedPoints 小数点位数
 * @returns 格式化的数字字符串
 */
export function renderNumber(
  num: number | bigint,
  fixedPoints?: number,
): string {
  num = Number(num);
  num = Math.max(num, 0);

  if (num >= 10_000_000) {
    const value = Math.floor(num / 100000) / 10;
    return value.toFixed(fixedPoints ?? 1) + "M";
  } else if (num >= 1_000_000) {
    const value = Math.floor(num / 10000) / 100;
    return value.toFixed(fixedPoints ?? 2) + "M";
  } else if (num >= 100000) {
    return Math.floor(num / 1000) + "K";
  } else if (num >= 10000) {
    const value = Math.floor(num / 100) / 10;
    return value.toFixed(fixedPoints ?? 1) + "K";
  } else if (num >= 1000) {
    const value = Math.floor(num / 10) / 100;
    return value.toFixed(fixedPoints ?? 2) + "K";
  } else {
    return Math.floor(num).toString();
  }
}

/**
 * 创建画布元素 - 创建一个全屏的HTML5 Canvas元素
 * @returns 配置好的Canvas元素
 */
export function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  // 设置画布样式以填充整个屏幕
  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";

  return canvas;
}

/**
 * 生成加密随机UUID - 为旧版浏览器提供crypto.randomUUID的polyfill实现
 * 特别是Safari版本 < 15.4的兼容性支持
 * @returns 生成的UUID字符串
 */
export function generateCryptoRandomUUID(): string {
  // 类型检查以确认randomUUID是否可用
  if (crypto !== undefined && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // 使用crypto.getRandomValues的回退实现
  if (crypto !== undefined && "getRandomValues" in crypto) {
    return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c: number): string =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16),
    );
  }

  // 最后的回退方案使用Math.random
  // 注意：这种方式的加密安全性较低，但确保功能可用
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c: string): string => {
      const r: number = (Math.random() * 16) | 0;
      const v: number = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

/**
 * 翻译文本 - 根据当前语言设置翻译指定的文本键
 * @param key 翻译键
 * @param params 翻译参数对象
 * @returns 翻译后的文本
 */
export const translateText = (
  key: string,
  params: Record<string, string | number> = {},
): string => {
  const self = translateText as any;
  self.formatterCache ??= new Map();
  self.lastLang ??= null;

  const langSelector = document.querySelector("lang-selector") as LangSelector;
  if (!langSelector) {
    console.warn("LangSelector not found in DOM");
    return key;
  }

  if (
    !langSelector.translations ||
    Object.keys(langSelector.translations).length === 0
  ) {
    return key;
  }

  if (self.lastLang !== langSelector.currentLang) {
    self.formatterCache.clear();
    self.lastLang = langSelector.currentLang;
  }

  let message = langSelector.translations[key];

  if (!message && langSelector.defaultTranslations) {
    const defaultTranslations = langSelector.defaultTranslations;
    if (defaultTranslations && defaultTranslations[key]) {
      message = defaultTranslations[key];
    }
  }

  if (!message) return key;

  try {
    const locale =
      !langSelector.translations[key] && langSelector.currentLang !== "en"
        ? "en"
        : langSelector.currentLang;
    const cacheKey = `${key}:${locale}:${message}`;
    let formatter = self.formatterCache.get(cacheKey);

    if (!formatter) {
      formatter = new IntlMessageFormat(message, locale);
      self.formatterCache.set(cacheKey, formatter);
    }

    return formatter.format(params) as string;
  } catch (e) {
    console.warn("ICU format error", e);
    return message;
  }
};

/**
 * 严重程度颜色映射 - 为不同类型的消息定义对应的CSS颜色类
 * 用于在游戏界面中以不同颜色显示各种消息类型
 */
export const severityColors: Record<string, string> = {
  fail: "text-red-400",      // 失败/错误消息 - 红色
  warn: "text-yellow-400",   // 警告消息 - 黄色
  success: "text-green-400", // 成功消息 - 绿色
  info: "text-gray-200",     // 信息消息 - 灰色
  blue: "text-blue-400",     // 蓝色消息 - 蓝色
  white: "text-white",       // 默认消息 - 白色
};

/**
 * 获取消息类型的CSS样式类 - 根据消息类型的严重程度返回对应的CSS类
 * @param type 要获取样式的消息类型
 * @returns 消息类型对应的CSS类字符串
 */
export function getMessageTypeClasses(type: MessageType): string {
  switch (type) {
    // 成功类型的消息 - 使用绿色
    case MessageType.SAM_HIT:                    // 防空导弹命中
    case MessageType.CAPTURED_ENEMY_UNIT:       // 俘获敌方单位
    case MessageType.RECEIVED_GOLD_FROM_TRADE:  // 从贸易中获得金币
    case MessageType.CONQUERED_PLAYER:          // 征服玩家
      return severityColors["success"];
    
    // 失败/危险类型的消息 - 使用红色
    case MessageType.ATTACK_FAILED:             // 攻击失败
    case MessageType.ALLIANCE_REJECTED:         // 联盟被拒绝
    case MessageType.ALLIANCE_BROKEN:           // 联盟破裂
    case MessageType.UNIT_CAPTURED_BY_ENEMY:   // 单位被敌方俘获
    case MessageType.UNIT_DESTROYED:            // 单位被摧毁
      return severityColors["fail"];
    
    // 信息类型的消息 - 使用蓝色
    case MessageType.ATTACK_CANCELLED:          // 攻击取消
    case MessageType.ATTACK_REQUEST:            // 攻击请求
    case MessageType.ALLIANCE_ACCEPTED:         // 联盟接受
    case MessageType.SENT_GOLD_TO_PLAYER:      // 向玩家发送金币
    case MessageType.SENT_TROOPS_TO_PLAYER:    // 向玩家发送部队
    case MessageType.RECEIVED_GOLD_FROM_PLAYER: // 从玩家接收金币
    case MessageType.RECEIVED_TROOPS_FROM_PLAYER: // 从玩家接收部队
      return severityColors["blue"];
    
    // 警告类型的消息 - 使用黄色
    case MessageType.MIRV_INBOUND:              // 多弹头导弹来袭
    case MessageType.NUKE_INBOUND:              // 核弹来袭
    case MessageType.HYDROGEN_BOMB_INBOUND:     // 氢弹来袭
    case MessageType.SAM_MISS:                  // 防空导弹未命中
    case MessageType.ALLIANCE_EXPIRED:          // 联盟过期
    case MessageType.NAVAL_INVASION_INBOUND:    // 海军入侵来袭
    case MessageType.RENEW_ALLIANCE:            // 续约联盟
      return severityColors["warn"];
    
    // 一般信息类型的消息 - 使用灰色
    case MessageType.CHAT:                      // 聊天消息
    case MessageType.ALLIANCE_REQUEST:          // 联盟请求
      return severityColors["info"];
    
    // 默认情况 - 使用白色并输出警告
    default:
      console.warn(`Message type ${type} has no explicit color`);
      return severityColors["white"];
  }
}

/**
 * 获取修饰键 - 根据操作系统返回相应的修饰键符号
 * 在Mac系统上返回Command键(⌘)，在其他系统上返回Ctrl
 * @returns 修饰键的字符串表示
 */
export function getModifierKey(): string {
  const isMac = /Mac/.test(navigator.userAgent);
  if (isMac) {
    return "⌘"; // Command键
  } else {
    return "Ctrl";
  }
}

/**
 * 获取Alt键 - 根据操作系统返回相应的Alt键符号
 * 在Mac系统上返回Option键(⌥)，在其他系统上返回Alt
 * @returns Alt键的字符串表示
 */
export function getAltKey(): string {
  const isMac = /Mac/.test(navigator.userAgent);
  if (isMac) {
    return "⌥"; // Option键
  } else {
    return "Alt";
  }
}

/**
 * 获取游戏次数 - 从本地存储中读取玩家已玩游戏的次数
 * @returns 已玩游戏的次数，如果读取失败则返回0
 */
export function getGamesPlayed(): number {
  try {
    return parseInt(localStorage.getItem("gamesPlayed") ?? "0", 10) || 0;
  } catch (error) {
    console.warn("Failed to read games played from localStorage:", error);
    return 0;
  }
}

/**
 * 增加游戏次数 - 将已玩游戏次数加1并保存到本地存储
 * 用于统计玩家的游戏活跃度
 */
export function incrementGamesPlayed(): void {
  try {
    localStorage.setItem("gamesPlayed", (getGamesPlayed() + 1).toString());
  } catch (error) {
    console.warn("Failed to increment games played in localStorage:", error);
  }
}
