/**
 * 地形地图文件加载器
 * 
 * 该模块负责创建和导出游戏地形地图的文件加载器实例。
 * 
 * 主要功能：
 * - 使用FetchGameMapLoader类创建地图加载器
 * - 配置地图文件的基础路径为'/maps'
 * - 集成版本控制，确保加载正确版本的地图文件
 * - 提供统一的地图资源访问接口
 * 
 * 该加载器被游戏引擎用于：
 * - 动态加载不同的地形地图文件
 * - 处理地图文件的缓存和版本管理
 * - 支持地图的热更新和版本同步
 * 
 * 使用方式：
 * ```typescript
 * import { terrainMapFileLoader } from './TerrainMapFileLoader';
 * const mapData = await terrainMapFileLoader.loadMap('mapName');
 * ```
 */

import version from "../../resources/version.txt";
import { FetchGameMapLoader } from "../core/game/FetchGameMapLoader";

/**
 * 地形地图文件加载器实例
 * 
 * 这是一个预配置的FetchGameMapLoader实例，专门用于加载游戏地形地图。
 * 
 * 配置参数：
 * - 基础路径: '/maps' - 地图文件存储的服务器路径
 * - 版本号: version - 从版本文件中读取的当前版本号，用于缓存控制
 * 
 * 该实例提供了以下功能：
 * - 异步加载指定名称的地图文件
 * - 自动处理HTTP请求和响应
 * - 集成版本控制，防止缓存问题
 * - 错误处理和重试机制
 * 
 * @example
 * // 加载名为'desert'的地图
 * const desertMap = await terrainMapFileLoader.loadMap('desert');
 */
export const terrainMapFileLoader = new FetchGameMapLoader(`/maps`, version);
