/**
 * 回放速度倍数 - 定义游戏回放的播放速度选项
 * 提供不同的回放速度设置，数值越小播放越快
 */

/**
 * 回放速度倍数枚举
 * 定义回放播放的速度选项，数值表示帧间隔倍数
 */
export enum ReplaySpeedMultiplier {
  // 慢速播放 - 2倍间隔时间
  slow = 2,
  // 正常播放 - 1倍间隔时间
  normal = 1,
  // 快速播放 - 0.5倍间隔时间
  fast = 0.5,
  // 最快播放 - 无间隔时间
  fastest = 0,
}

// 默认回放速度倍数设置
export const defaultReplaySpeedMultiplier = ReplaySpeedMultiplier.normal;
