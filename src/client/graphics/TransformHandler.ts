/**
 * 变换处理器 - 管理游戏画布的缩放、平移和坐标转换
 * 处理相机移动、缩放操作和屏幕坐标与游戏世界坐标的转换
 */

import { EventBus } from "../../core/EventBus";
import { Cell } from "../../core/game/Game";
import { GameView } from "../../core/game/GameView";
import { CenterCameraEvent, DragEvent, ZoomEvent } from "../InputHandler";
import {
  GoToPlayerEvent,
  GoToPositionEvent,
  GoToUnitEvent,
} from "./layers/Leaderboard";

// 跳转动画间隔时间（毫秒）
export const GOTO_INTERVAL_MS = 16;
// 相机最大移动速度
export const CAMERA_MAX_SPEED = 15;
// 相机平滑系数
export const CAMERA_SMOOTHING = 0.03;

/**
 * 变换处理器类
 * 负责管理游戏视图的缩放、平移和坐标系转换
 */
export class TransformHandler {
  // 当前缩放比例
  public scale: number = 1.8;
  // Canvas边界矩形缓存
  private _boundingRect: DOMRect;
  // X轴偏移量
  private offsetX: number = -350;
  // Y轴偏移量
  private offsetY: number = -200;
  // 上次跳转调用时间
  private lastGoToCallTime: number | null = null;

  // 目标单元格（用于相机跟随）
  private target: Cell | null;
  // 动画定时器ID
  private intervalID: NodeJS.Timeout | null = null;
  // 变换是否发生改变的标志
  private changed = false;

  /**
   * 构造函数
   * @param game 游戏视图实例
   * @param eventBus 事件总线实例
   * @param canvas HTML5 Canvas元素
   */
  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private canvas: HTMLCanvasElement,
  ) {
    this._boundingRect = this.canvas.getBoundingClientRect();
    // 注册事件监听器
    this.eventBus.on(ZoomEvent, (e) => this.onZoom(e));
    this.eventBus.on(DragEvent, (e) => this.onMove(e));
    this.eventBus.on(GoToPlayerEvent, (e) => this.onGoToPlayer(e));
    this.eventBus.on(GoToPositionEvent, (e) => this.onGoToPosition(e));
    this.eventBus.on(GoToUnitEvent, (e) => this.onGoToUnit(e));
    this.eventBus.on(CenterCameraEvent, () => this.centerCamera());
  }

  /**
   * 更新Canvas边界矩形
   * 当窗口大小改变时需要调用此方法
   */
  public updateCanvasBoundingRect() {
    this._boundingRect = this.canvas.getBoundingClientRect();
  }

  /**
   * 获取Canvas边界矩形
   * @returns Canvas的边界矩形
   */
  boundingRect(): DOMRect {
    return this._boundingRect;
  }

  /**
   * 获取Canvas宽度
   * @returns Canvas宽度
   */
  width(): number {
    return this.boundingRect().width;
  }

  /**
   * 检查变换是否发生改变
   * @returns 是否发生改变
   */
  hasChanged(): boolean {
    return this.changed;
  }

  /**
   * 重置变换改变标志
   */
  resetChanged() {
    this.changed = false;
  }

  /**
   * 处理Canvas变换
   * 应用缩放和平移变换到渲染上下文
   * @param context Canvas 2D渲染上下文
   */
  handleTransform(context: CanvasRenderingContext2D) {
    // 禁用图像平滑以获得像素化效果
    context.imageSmoothingEnabled = false;

    // 应用缩放和平移
    context.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.game.width() / 2 - this.offsetX * this.scale,
      this.game.height() / 2 - this.offsetY * this.scale,
    );
  }

  /**
   * 将游戏世界坐标转换为屏幕坐标
   * @param cell 游戏世界中的单元格
   * @returns 屏幕坐标 {x, y}
   */
  worldToScreenCoordinates(cell: Cell): { x: number; y: number } {
    // 步骤1：从Cell坐标转换为游戏坐标
    // （Math.floor操作的逆向 - 我们将使用精确值）
    const gameX = cell.x;
    const gameY = cell.y;

    // 步骤2：逆向游戏中心偏移计算
    // 原始：gameX = centerX + this.game.width() / 2
    // Therefore: centerX = gameX - this.game.width() / 2
    const centerX = gameX - this.game.width() / 2;
    const centerY = gameY - this.game.height() / 2;

    // Step 3: Reverse the world point calculation
    // Original: centerX = (canvasX - this.game.width() / 2) / this.scale + this.offsetX
    // Therefore: canvasX = (centerX - this.offsetX) * this.scale + this.game.width() / 2
    const canvasX =
      (centerX - this.offsetX) * this.scale + this.game.width() / 2;
    const canvasY =
      (centerY - this.offsetY) * this.scale + this.game.height() / 2;

    // Step 4: Convert canvas coordinates back to screen coordinates
    const canvasRect = this.boundingRect();
    const screenX = canvasX + canvasRect.left;
    const screenY = canvasY + canvasRect.top;
    return { x: screenX, y: screenY };
  }

  screenToWorldCoordinates(screenX: number, screenY: number): Cell {
    const canvasRect = this.boundingRect();
    const canvasX = screenX - canvasRect.left;
    const canvasY = screenY - canvasRect.top;

    // Calculate the world point we want to zoom towards
    const centerX =
      (canvasX - this.game.width() / 2) / this.scale + this.offsetX;
    const centerY =
      (canvasY - this.game.height() / 2) / this.scale + this.offsetY;

    const gameX = centerX + this.game.width() / 2;
    const gameY = centerY + this.game.height() / 2;

    return new Cell(Math.floor(gameX), Math.floor(gameY));
  }

  screenBoundingRect(): [Cell, Cell] {
    const canvasRect = this.boundingRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    const LeftX = -this.game.width() / 2 / this.scale + this.offsetX;
    const TopY = -this.game.height() / 2 / this.scale + this.offsetY;

    const gameLeftX = LeftX + this.game.width() / 2;
    const gameTopY = TopY + this.game.height() / 2;

    const rightX =
      (canvasWidth - this.game.width() / 2) / this.scale + this.offsetX;
    const bottomY =
      (canvasHeight - this.game.height() / 2) / this.scale + this.offsetY;

    const gameRightX = rightX + this.game.width() / 2;
    const gameBottomY = bottomY + this.game.height() / 2;

    return [
      new Cell(Math.floor(gameLeftX), Math.floor(gameTopY)),
      new Cell(Math.floor(gameRightX), Math.floor(gameBottomY)),
    ];
  }

  isOnScreen(cell: Cell): boolean {
    const [topLeft, bottomRight] = this.screenBoundingRect();
    return (
      cell.x > topLeft.x &&
      cell.x < bottomRight.x &&
      cell.y > topLeft.y &&
      cell.y < bottomRight.y
    );
  }

  screenCenter(): { screenX: number; screenY: number } {
    const [upperLeft, bottomRight] = this.screenBoundingRect();
    return {
      screenX: upperLeft.x + Math.floor((bottomRight.x - upperLeft.x) / 2),
      screenY: upperLeft.y + Math.floor((bottomRight.y - upperLeft.y) / 2),
    };
  }

  onGoToPlayer(event: GoToPlayerEvent) {
    this.game.setFocusedPlayer(event.player);
    this.clearTarget();
    const nameLocation = event.player.nameLocation();
    if (!nameLocation) {
      return;
    }
    this.target = new Cell(nameLocation.x, nameLocation.y);
    this.intervalID = setInterval(() => this.goTo(), GOTO_INTERVAL_MS);
  }

  onGoToPosition(event: GoToPositionEvent) {
    this.clearTarget();
    this.target = new Cell(event.x, event.y);
    this.intervalID = setInterval(() => this.goTo(), GOTO_INTERVAL_MS);
  }

  onGoToUnit(event: GoToUnitEvent) {
    this.clearTarget();
    this.target = new Cell(
      this.game.x(event.unit.lastTile()),
      this.game.y(event.unit.lastTile()),
    );
    this.intervalID = setInterval(() => this.goTo(), GOTO_INTERVAL_MS);
  }

  centerCamera() {
    this.clearTarget();
    const player = this.game.myPlayer();
    if (!player || !player.nameLocation()) return;
    this.target = new Cell(player.nameLocation().x, player.nameLocation().y);
    this.intervalID = setInterval(() => this.goTo(), GOTO_INTERVAL_MS);
  }

  private goTo() {
    const { screenX, screenY } = this.screenCenter();

    if (this.target === null) throw new Error("null target");

    if (
      Math.abs(this.target.x - screenX) + Math.abs(this.target.y - screenY) <
      2
    ) {
      this.clearTarget();
      return;
    }

    let dt: number;
    const now = window.performance.now();
    if (this.lastGoToCallTime === null) {
      dt = GOTO_INTERVAL_MS;
    } else {
      dt = now - this.lastGoToCallTime;
    }
    this.lastGoToCallTime = now;

    const r = 1 - Math.pow(CAMERA_SMOOTHING, dt / 1000);

    this.offsetX += Math.max(
      Math.min((this.target.x - screenX) * r, CAMERA_MAX_SPEED),
      -CAMERA_MAX_SPEED,
    );
    this.offsetY += Math.max(
      Math.min((this.target.y - screenY) * r, CAMERA_MAX_SPEED),
      -CAMERA_MAX_SPEED,
    );

    this.changed = true;
  }

  onZoom(event: ZoomEvent) {
    this.clearTarget();
    const oldScale = this.scale;
    const zoomFactor = 1 + event.delta / 600;
    this.scale /= zoomFactor;

    // Clamp the scale to prevent extreme zooming
    this.scale = Math.max(0.2, Math.min(20, this.scale));

    const canvasRect = this.boundingRect();
    const canvasX = event.x - canvasRect.left;
    const canvasY = event.y - canvasRect.top;

    // Calculate the world point we want to zoom towards
    const zoomPointX =
      (canvasX - this.game.width() / 2) / oldScale + this.offsetX;
    const zoomPointY =
      (canvasY - this.game.height() / 2) / oldScale + this.offsetY;

    // Adjust the offset
    this.offsetX = zoomPointX - (canvasX - this.game.width() / 2) / this.scale;
    this.offsetY = zoomPointY - (canvasY - this.game.height() / 2) / this.scale;
    this.changed = true;
  }

  onMove(event: DragEvent) {
    this.clearTarget();
    this.offsetX -= event.deltaX / this.scale;
    this.offsetY -= event.deltaY / this.scale;
    this.changed = true;
  }

  private clearTarget() {
    if (this.intervalID !== null) {
      clearInterval(this.intervalID);
      this.intervalID = null;
    }
    this.target = null;
  }

  override(x: number = 0, y: number = 0, s: number = 1) {
    //hardset view position
    this.clearTarget();
    this.offsetX = x;
    this.offsetY = y;
    this.scale = s;
    this.changed = true;
  }

  centerAll(fit: number = 1) {
    //position entire map centered on the screen

    const vpWidth = this.boundingRect().width;
    const vpHeight = this.boundingRect().height;
    const mapWidth = this.game.width();
    const mapHeight = this.game.height();

    const scHor = (vpWidth / mapWidth) * fit;
    const scVer = (vpHeight / mapHeight) * fit;
    const tScale = Math.min(scHor, scVer);

    const oHor = (mapWidth - vpWidth) / 2 / tScale;
    const oVer = (mapHeight - vpHeight) / 2 / tScale;

    this.override(oHor, oVer, tScale);
  }
}
