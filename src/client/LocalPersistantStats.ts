/**
 * 本地持久化游戏统计数据管理模块
 * 
 * 这个模块负责管理游戏统计数据的本地存储，使用 localStorage 进行数据持久化。
 * 主要功能包括：
 * - 游戏开始时保存大厅配置信息
 * - 游戏结束时保存完整的游戏记录
 * - 提供游戏开始时间的跟踪
 * - 异步保存机制以避免阻塞主线程
 * 
 * 数据结构：
 * - 以游戏ID为键，存储每个游戏的大厅配置和游戏记录
 * - 支持部分游戏记录的存储和检索
 * 
 * 使用场景：
 * - 单人游戏模式的数据持久化
 * - 游戏统计和历史记录管理
 * - 离线游戏数据的本地缓存
 * 
 * 技术特点：
 * - 使用 localStorage 进行浏览器本地存储
 * - 异步保存机制提升性能
 * - 支持 JSON 序列化和反序列化
 * - 容错处理，支持 localStorage 不可用的情况
 */

// 游戏配置、游戏ID和部分游戏记录的类型定义
import { GameConfig, GameID, PartialGameRecord } from "../core/Schemas";
// 工具函数，用于 JSON 序列化时的数据替换处理
import { replacer } from "../core/Util";

/**
 * 本地统计数据的数据结构接口
 * 
 * 定义了存储在 localStorage 中的游戏统计数据的结构。
 * 使用游戏ID作为键，每个游戏包含大厅配置和可选的游戏记录。
 */
export interface LocalStatsData {
  /**
   * 游戏统计数据映射
   * 
   * 键：游戏ID（GameID）
   * 值：包含大厅配置和游戏记录的对象
   */
  [key: GameID]: {
    /**
     * 大厅配置信息
     * 
     * 存储游戏开始时的配置参数，包括游戏规则、地图设置等。
     * 使用 Partial 类型允许部分配置信息。
     */
    lobby: Partial<GameConfig>;
    
    /**
     * 游戏记录（可选）
     * 
     * 只有在游戏结束后才会设置此字段。
     * 包含完整的游戏过程记录，如回合数据、玩家统计等。
     */
    gameRecord?: PartialGameRecord;
  };
}

/**
 * 游戏开始时间的私有变量
 * 
 * 用于记录当前游戏的开始时间戳，供计算游戏时长使用。
 */
let _startTime: number;

/**
 * 获取本地存储的统计数据
 * 
 * 从 localStorage 中读取游戏统计数据。如果数据不存在或解析失败，
 * 返回空对象作为默认值。
 * 
 * @returns {LocalStatsData} 本地统计数据对象
 */
function getStats(): LocalStatsData {
  const statsStr = localStorage.getItem("game-records");
  return statsStr ? JSON.parse(statsStr) : {};
}

/**
 * 保存统计数据到本地存储
 * 
 * 将统计数据异步保存到 localStorage 中。使用 setTimeout 
 * 确保保存操作不会阻塞主线程，提升用户体验。
 * 
 * 特点：
 * - 异步执行，避免阻塞UI
 * - 使用自定义 replacer 函数处理特殊数据类型
 * - 自动序列化为 JSON 格式
 * 
 * @param {LocalStatsData} stats 要保存的统计数据
 */
function save(stats: LocalStatsData) {
  // To execute asynchronously
  setTimeout(
    () => localStorage.setItem("game-records", JSON.stringify(stats, replacer)),
    0,
  );
}

/**
 * 开始游戏并保存初始配置
 * 
 * 当游戏开始时调用此函数，保存游戏的大厅配置信息。
 * 由于用户可能随时退出游戏，所以在游戏开始时就保存配置，
 * 确保即使游戏未正常结束也能保留基本信息。
 * 
 * 功能：
 * - 记录游戏开始时间
 * - 保存大厅配置到本地存储
 * - 处理 localStorage 不可用的情况
 * 
 * @param {GameID} id 游戏唯一标识符
 * @param {Partial<GameConfig>} lobby 大厅配置信息
 */
// The user can quit the game anytime so better save the lobby as soon as the
// game starts.
export function startGame(id: GameID, lobby: Partial<GameConfig>) {
  if (localStorage === undefined) {
    return;
  }

  _startTime = Date.now();
  const stats = getStats();
  stats[id] = { lobby };
  save(stats);
}

/**
 * 获取游戏开始时间
 * 
 * 返回当前游戏的开始时间戳，用于计算游戏时长等统计信息。
 * 
 * @returns {number} 游戏开始时间的时间戳
 */
export function startTime() {
  return _startTime;
}

/**
 * 结束游戏并保存完整记录
 * 
 * 当游戏结束时调用此函数，将完整的游戏记录添加到已存在的
 * 游戏统计数据中。如果找不到对应的游戏记录，会输出错误信息。
 * 
 * 功能：
 * - 查找对应的游戏统计记录
 * - 添加完整的游戏记录信息
 * - 保存更新后的数据到本地存储
 * - 错误处理和日志记录
 * 
 * @param {PartialGameRecord} gameRecord 完整的游戏记录
 */
export function endGame(gameRecord: PartialGameRecord) {
  if (localStorage === undefined) {
    return;
  }

  const stats = getStats();
  const gameStat = stats[gameRecord.info.gameID];

  if (!gameStat) {
    console.log("LocalPersistantStats: game not found");
    return;
  }

  gameStat.gameRecord = gameRecord;
  save(stats);
}
