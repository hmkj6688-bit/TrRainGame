/**
 * 输入处理器模块
 * 
 * 该模块负责处理游戏中的所有用户输入事件，包括：
 * - 鼠标事件（点击、移动、滚轮、拖拽）
 * - 键盘事件（按键绑定、快捷键）
 * - 触摸事件（移动端支持）
 * - 手势识别（缩放、平移）
 * 
 * 主要功能：
 * 1. 事件监听和处理 - 监听各种用户输入事件
 * 2. 事件转换和分发 - 将原生事件转换为游戏事件并分发
 * 3. 键盘快捷键管理 - 支持自定义键位绑定
 * 4. 多点触控支持 - 支持移动设备的触摸操作
 * 5. 相机控制 - 处理视角移动、缩放等操作
 * 6. 游戏交互 - 处理单位选择、建筑菜单、攻击等游戏操作
 * 
 * 技术特性：
 * - 跨平台兼容（桌面端和移动端）
 * - 可配置的键位绑定
 * - 防抖和节流处理
 * - 事件优先级管理
 * - Mac/Windows 平台适配
 * 
 * @author OpenFrontIO Team
 * @version 1.0.0
 */

// 导入事件总线和游戏事件基类，用于事件分发和处理
import { EventBus, GameEvent } from "../core/EventBus";
// 导入单位类型枚举，用于建筑切换事件
import { UnitType } from "../core/game/Game";
// 导入单位视图类，用于单位选择事件
import { UnitView } from "../core/game/GameView";
// 导入用户设置类，用于获取用户偏好设置
import { UserSettings } from "../core/game/UserSettings";
// 导入回放速度倍数类型，用于回放控制事件
import { ReplaySpeedMultiplier } from "./utilities/ReplaySpeedMultiplier";

/**
 * 鼠标抬起事件
 * 当用户释放鼠标按键时触发，用于处理点击完成、选择确认等操作
 */
export class MouseUpEvent implements GameEvent {
  constructor(
    public readonly x: number, // 鼠标抬起时的X坐标（屏幕坐标系）
    public readonly y: number, // 鼠标抬起时的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 鼠标悬停事件
 * 当鼠标在画布上移动但未按下时触发，用于显示悬停提示、高亮等效果
 */
export class MouseOverEvent implements GameEvent {
  constructor(
    public readonly x: number, // 鼠标当前X坐标（屏幕坐标系）
    public readonly y: number, // 鼠标当前Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 单位选择事件
 * 当用户选择或取消选择游戏单位时触发，用于更新UI状态和游戏逻辑
 */
export class UnitSelectionEvent implements GameEvent {
  constructor(
    public readonly unit: UnitView | null, // 被选择的单位视图对象，null表示取消选择
    public readonly isSelected: boolean,   // 选择状态：true表示选中，false表示取消选中
  ) {}
}

/**
 * 鼠标按下事件
 * 当用户按下鼠标按键时触发，用于开始拖拽、选择等操作
 */
export class MouseDownEvent implements GameEvent {
  constructor(
    public readonly x: number, // 鼠标按下时的X坐标（屏幕坐标系）
    public readonly y: number, // 鼠标按下时的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 鼠标移动事件
 * 当鼠标在屏幕上移动时触发，用于实时跟踪鼠标位置
 */
export class MouseMoveEvent implements GameEvent {
  constructor(
    public readonly x: number, // 鼠标当前X坐标（屏幕坐标系）
    public readonly y: number, // 鼠标当前Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 右键菜单事件
 * 当用户右键点击或长按（移动端）时触发，用于显示上下文菜单
 */
export class ContextMenuEvent implements GameEvent {
  constructor(
    public readonly x: number, // 右键点击的X坐标（屏幕坐标系）
    public readonly y: number, // 右键点击的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 缩放事件
 * 当用户使用滚轮或手势进行缩放时触发，用于调整游戏视角的缩放级别
 */
export class ZoomEvent implements GameEvent {
  constructor(
    public readonly x: number,     // 缩放中心点X坐标（屏幕坐标系）
    public readonly y: number,     // 缩放中心点Y坐标（屏幕坐标系）
    public readonly delta: number, // 缩放增量：正值表示放大，负值表示缩小
  ) {}
}

/**
 * 拖拽事件
 * 当用户拖拽鼠标或触摸屏幕时触发，用于平移游戏视角
 */
export class DragEvent implements GameEvent {
  constructor(
    public readonly deltaX: number, // X轴拖拽距离（像素）
    public readonly deltaY: number, // Y轴拖拽距离（像素）
  ) {}
}

/**
 * 备用视图切换事件
 * 当用户按住空格键时触发，用于切换到备用显示模式（如显示额外信息）
 */
export class AlternateViewEvent implements GameEvent {
  constructor(public readonly alternateView: boolean) {} // true表示启用备用视图，false表示关闭
}

/**
 * 关闭视图事件
 * 当用户按下ESC键时触发，用于关闭当前打开的菜单或对话框
 */
export class CloseViewEvent implements GameEvent {}

/**
 * 刷新图形事件
 * 当用户按下Alt+R时触发，用于重新加载和刷新游戏图形资源
 */
export class RefreshGraphicsEvent implements GameEvent {}

/**
 * 切换性能覆盖层事件
 * 当用户按下Shift+D时触发，用于显示或隐藏性能监控信息
 */
export class TogglePerformanceOverlayEvent implements GameEvent {}

/**
 * 切换建筑类型事件
 * 用于在不同建筑类型之间切换，或取消当前选择的建筑类型
 */
export class ToggleStructureEvent implements GameEvent {
  constructor(public readonly structureType: UnitType | null) {} // 要切换到的建筑类型，null表示取消选择
}

/**
 * 显示建造菜单事件
 * 当用户按住修饰键点击时触发，用于在指定位置显示建造菜单
 */
export class ShowBuildMenuEvent implements GameEvent {
  constructor(
    public readonly x: number, // 菜单显示位置的X坐标（屏幕坐标系）
    public readonly y: number, // 菜单显示位置的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 显示表情菜单事件
 * 当用户按住Alt键点击时触发，用于在指定位置显示表情选择菜单
 */
export class ShowEmojiMenuEvent implements GameEvent {
  constructor(
    public readonly x: number, // 菜单显示位置的X坐标（屏幕坐标系）
    public readonly y: number, // 菜单显示位置的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 执行船只攻击事件
 * 当用户按下B键时触发，用于执行海军单位的攻击命令
 */
export class DoBoatAttackEvent implements GameEvent {}

/**
 * 执行地面攻击事件
 * 当用户按下G键时触发，用于执行陆军单位的攻击命令
 */
export class DoGroundAttackEvent implements GameEvent {}

/**
 * 攻击比例调整事件
 * 当用户按下数字键或使用Shift+滚轮时触发，用于调整攻击力度分配比例
 */
export class AttackRatioEvent implements GameEvent {
  constructor(public readonly attackRatio: number) {} // 攻击比例调整值：正值增加，负值减少
}

/**
 * 回放速度变更事件
 * 用于在回放模式下调整播放速度
 */
export class ReplaySpeedChangeEvent implements GameEvent {
  constructor(public readonly replaySpeedMultiplier: ReplaySpeedMultiplier) {} // 新的回放速度倍数
}

/**
 * 相机居中事件
 * 当用户按下C键时触发，用于将相机视角居中到默认位置
 */
export class CenterCameraEvent implements GameEvent {
  constructor() {}
}

/**
 * 自动升级事件
 * 当用户使用中键点击时触发，用于自动升级指定位置的建筑或单位
 */
export class AutoUpgradeEvent implements GameEvent {
  constructor(
    public readonly x: number, // 点击位置的X坐标（屏幕坐标系）
    public readonly y: number, // 点击位置的Y坐标（屏幕坐标系）
  ) {}
}

/**
 * 输入处理器类
 * 
 * 负责处理游戏中的所有用户输入事件，包括鼠标、键盘、触摸等交互。
 * 将原生的DOM事件转换为游戏内部事件，并通过事件总线分发给其他系统。
 * 
 * 主要职责：
 * - 监听和处理各种用户输入事件
 * - 管理键盘快捷键绑定
 * - 支持多点触控和手势识别
 * - 处理相机控制（平移、缩放）
 * - 管理游戏交互（选择、攻击、建造等）
 */
export class InputHandler {
  // 鼠标位置跟踪
  private lastPointerX: number = 0;      // 上一次指针的X坐标
  private lastPointerY: number = 0;      // 上一次指针的Y坐标

  // 鼠标按下位置跟踪（用于判断是否为点击而非拖拽）
  private lastPointerDownX: number = 0;  // 鼠标按下时的X坐标
  private lastPointerDownY: number = 0;  // 鼠标按下时的Y坐标

  // 多点触控支持
  private pointers: Map<number, PointerEvent> = new Map(); // 存储所有活动的指针事件

  // 缩放手势支持
  private lastPinchDistance: number = 0; // 上一次双指间距离（用于缩放计算）

  // 输入状态跟踪
  private pointerDown: boolean = false;  // 指针是否处于按下状态
  private alternateView = false;         // 是否处于备用视图模式（按住空格键）

  // 键盘输入处理
  private moveInterval: NodeJS.Timeout | null = null; // 移动操作的定时器
  private activeKeys = new Set<string>();              // 当前按下的按键集合
  private keybinds: Record<string, string> = {};       // 键位绑定配置

  // U键长按自动升级功能
  private uKeyPressTimer: NodeJS.Timeout | null = null;  // U键长按检测定时器
  private uKeyHoldInterval: NodeJS.Timeout | null = null; // U键长按重复触发定时器
  private isUKeyLongPress: boolean = false;               // 是否为U键长按状态

  // 移动和缩放速度常量
  private readonly PAN_SPEED = 5;   // 键盘平移速度（像素/帧）
  private readonly ZOOM_SPEED = 10; // 键盘缩放速度

  // 用户设置实例
  private userSettings: UserSettings = new UserSettings();

  /**
   * 构造函数
   * @param canvas - 游戏画布元素，用于监听输入事件
   * @param eventBus - 事件总线，用于分发游戏事件
   */
  constructor(
    private canvas: HTMLCanvasElement,
    private eventBus: EventBus,
  ) {}

  /**
   * 初始化输入处理器
   * 设置键位绑定、注册事件监听器、启动键盘输入循环
   */
  initialize() {
    // 设置默认键位绑定
    this.keybinds = {
      toggleView: "Space",        // 切换备用视图
      centerCamera: "KeyC",       // 相机居中
      moveUp: "KeyW",            // 向上移动
      moveDown: "KeyS",          // 向下移动
      moveLeft: "KeyA",          // 向左移动
      moveRight: "KeyD",         // 向右移动
      zoomOut: "KeyQ",           // 缩小
      zoomIn: "KeyE",            // 放大
      attackRatioDown: "Digit1", // 降低攻击比例
      attackRatioUp: "Digit2",   // 提高攻击比例
      boatAttack: "KeyB",        // 船只攻击
      groundAttack: "KeyG",      // 地面攻击
      modifierKey: "ControlLeft", // 修饰键（用于建造菜单）
      altKey: "AltLeft",         // Alt键（用于表情菜单）
      // 从本地存储加载用户自定义键位绑定
      ...JSON.parse(localStorage.getItem("settings.keybinds") ?? "{}"),
    };

    // Mac平台适配：使用Command键替代Ctrl键
    const isMac = /Mac/.test(navigator.userAgent);
    if (isMac) {
      this.keybinds.modifierKey = "MetaLeft"; // 在Mac上使用Command键
    }

    // 注册指针按下事件监听器（支持鼠标和触摸）
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    
    // 注册全局指针抬起事件监听器（防止指针移出画布后无法捕获抬起事件）
    window.addEventListener("pointerup", (e) => this.onPointerUp(e));
    
    // 注册滚轮事件监听器，支持缩放和平移
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        // 优先处理触控板平移手势
        if (!this.onTrackpadPan(e)) {
          // 如果不是平移手势，则处理普通滚轮缩放
          this.onScroll(e);
        }
        // 处理 Shift+滚轮 的特殊操作
        this.onShiftScroll(e);
        // 阻止默认滚动行为
        e.preventDefault();
      },
      { passive: false }, // 非被动模式，允许阻止默认行为
    );
    
    // 注册全局指针移动事件监听器
    window.addEventListener("pointermove", this.onPointerMove.bind(this));
    
    // 注册右键菜单事件监听器
    this.canvas.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    
    // 注册鼠标移动事件监听器（用于发送鼠标位置更新事件）
    window.addEventListener("mousemove", (e) => {
      // 只有当鼠标实际移动时才发送事件（避免无效事件）
      if (e.movementX || e.movementY) {
        this.eventBus.emit(new MouseMoveEvent(e.clientX, e.clientY));
      }
    });

    // 注册触摸事件监听器（移动设备支持）
    this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), {
      passive: false, // 非被动模式，允许阻止默认行为
    });
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), {
      passive: false, // 非被动模式，允许阻止默认行为
    });
    this.canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), {
      passive: false, // 非被动模式，允许阻止默认行为
    });
    
    // 清空指针映射表
    this.pointers.clear();

    /**
     * 键盘输入处理循环
     * 定时检查当前按下的按键，并执行相应的操作（移动、缩放等）
     * 使用定时器而不是键盘事件是为了实现平滑的连续操作
     */
    this.moveInterval = setInterval(() => {
      let deltaX = 0; // X轴移动增量
      let deltaY = 0; // Y轴移动增量

      // 如果按住 Shift 键，跳过移动操作（Shift 用于其他功能）
      if (
        this.activeKeys.has("ShiftLeft") ||
        this.activeKeys.has("ShiftRight")
      ) {
        return;
      }

      // 检查向上移动键（W键或方向键上）
      if (
        this.activeKeys.has(this.keybinds.moveUp) ||
        this.activeKeys.has("ArrowUp")
      )
        deltaY += this.PAN_SPEED;
      
      // 检查向下移动键（S键或方向键下）
      if (
        this.activeKeys.has(this.keybinds.moveDown) ||
        this.activeKeys.has("ArrowDown")
      )
        deltaY -= this.PAN_SPEED;
      
      // 检查向左移动键（A键或方向键左）
      if (
        this.activeKeys.has(this.keybinds.moveLeft) ||
        this.activeKeys.has("ArrowLeft")
      )
        deltaX += this.PAN_SPEED;
      
      // 检查向右移动键（D键或方向键右）
      if (
        this.activeKeys.has(this.keybinds.moveRight) ||
        this.activeKeys.has("ArrowRight")
      )
        deltaX -= this.PAN_SPEED;

      // 如果有移动操作，发送拖拽事件
      if (deltaX || deltaY) {
        this.eventBus.emit(new DragEvent(deltaX, deltaY));
      }

      // 获取屏幕中心点坐标（用作缩放中心）
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // 检查缩小键（-键或自定义键位）
      if (
        this.activeKeys.has(this.keybinds.zoomOut) ||
        this.activeKeys.has("Minus")
      ) {
        this.eventBus.emit(new ZoomEvent(cx, cy, this.ZOOM_SPEED));
      }
      
      // 检查放大键（=键或自定义键位）
      if (
        this.activeKeys.has(this.keybinds.zoomIn) ||
        this.activeKeys.has("Equal")
      ) {
        this.eventBus.emit(new ZoomEvent(cx, cy, -this.ZOOM_SPEED));
      }
    }, 1); // 每毫秒执行一次键盘输入检查

    // 注册键盘按下事件监听器
    window.addEventListener("keydown", (e) => {
      // 处理切换视图键（通常是空格键）
      if (e.code === this.keybinds.toggleView) {
        e.preventDefault();
        if (!this.alternateView) {
          this.alternateView = true;
          this.eventBus.emit(new AlternateViewEvent(true));
        }
      }

      // 处理 ESC 键（关闭视图）
      if (e.code === "Escape") {
        e.preventDefault();
        this.eventBus.emit(new CloseViewEvent());
      }

      // 处理 U 键长按检测
      if (e.code === "KeyU" && !e.repeat) {
        e.preventDefault();
        // 清除之前的定时器（防止重复按键）
        if (this.uKeyPressTimer) {
          clearTimeout(this.uKeyPressTimer);
        }
        
        // 设置长按检测定时器（1秒后触发长按模式）
        this.uKeyPressTimer = setTimeout(() => {
          this.isUKeyLongPress = true;
          
          // 立即触发一次自动升级
          const rect = this.canvas.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          this.eventBus.emit(new AutoUpgradeEvent(centerX, centerY));
          
          // 开始重复触发（每100毫秒触发一次）
          this.uKeyHoldInterval = setInterval(() => {
            this.eventBus.emit(new AutoUpgradeEvent(centerX, centerY));
          }, 100);
        }, 500); // 1秒后开始长按模式
      }

      // 将需要持续响应的按键添加到活动按键集合中
      if (
        [
          this.keybinds.moveUp,
          this.keybinds.moveDown,
          this.keybinds.moveLeft,
          this.keybinds.moveRight,
          this.keybinds.zoomOut,
          this.keybinds.zoomIn,
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
          "Minus",
          "Equal",
          this.keybinds.attackRatioDown,
          this.keybinds.attackRatioUp,
          this.keybinds.centerCamera,
          "ControlLeft",
          "ControlRight",
          "ShiftLeft",
          "ShiftRight",
        ].includes(e.code)
      ) {
        this.activeKeys.add(e.code);
      }
    });

    // 注册键盘抬起事件监听器
    window.addEventListener("keyup", (e) => {
      // 处理切换视图键抬起
      if (e.code === this.keybinds.toggleView) {
        e.preventDefault();
        this.alternateView = false;
        this.eventBus.emit(new AlternateViewEvent(false));
      }

      // 处理 Alt+R 刷新图形
      if (e.key.toLowerCase() === "r" && e.altKey && !e.ctrlKey) {
        e.preventDefault();
        this.eventBus.emit(new RefreshGraphicsEvent());
      }

      // 处理船只攻击键
      if (e.code === this.keybinds.boatAttack) {
        e.preventDefault();
        this.eventBus.emit(new DoBoatAttackEvent());
      }

      // 处理地面攻击键
      if (e.code === this.keybinds.groundAttack) {
        e.preventDefault();
        this.eventBus.emit(new DoGroundAttackEvent());
      }

      // 处理攻击比例减少键
      if (e.code === this.keybinds.attackRatioDown) {
        e.preventDefault();
        this.eventBus.emit(new AttackRatioEvent(-10));
      }

      // 处理攻击比例增加键
      if (e.code === this.keybinds.attackRatioUp) {
        e.preventDefault();
        this.eventBus.emit(new AttackRatioEvent(10));
      }

      // 处理相机居中键
      if (e.code === this.keybinds.centerCamera) {
        e.preventDefault();
        this.eventBus.emit(new CenterCameraEvent());
      }

      // 处理 U 键自动升级（支持单击和长按两种模式）
      if (e.code === "KeyU") {
        e.preventDefault();
        
        // 清除长按相关的定时器
        if (this.uKeyPressTimer) {
          clearTimeout(this.uKeyPressTimer);
          this.uKeyPressTimer = null;
        }
        
        if (this.uKeyHoldInterval) {
          clearInterval(this.uKeyHoldInterval);
          this.uKeyHoldInterval = null;
        }
        
        // 如果不是长按模式，则执行单次升级
        if (!this.isUKeyLongPress) {
          const rect = this.canvas.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          this.eventBus.emit(new AutoUpgradeEvent(centerX, centerY));
        }
        
        // 重置长按状态
        this.isUKeyLongPress = false;
      }

      // 处理 Shift+D 切换性能覆盖层
      console.log(e.code, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey);
      if (e.code === "KeyD" && e.shiftKey) {
        e.preventDefault();
        console.log("TogglePerformanceOverlayEvent");
        this.eventBus.emit(new TogglePerformanceOverlayEvent());
      }

      // 从活动按键集合中移除抬起的按键
      this.activeKeys.delete(e.code);
    });
  }

  /**
   * 处理指针按下事件（鼠标按下或触摸开始）
   * @param event 指针事件对象
   */
  private onPointerDown(event: PointerEvent) {
    // 忽略右键和其他按键
    if (event.button > 0) {
      return;
    }

    // 设置指针按下状态并记录指针信息
    this.pointerDown = true;
    this.pointers.set(event.pointerId, event);

    // 单指操作
    if (this.pointers.size === 1) {
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;

      this.lastPointerDownX = event.clientX;
      this.lastPointerDownY = event.clientY;

      this.eventBus.emit(new MouseDownEvent(event.clientX, event.clientY));
    } 
    // 双指操作（触摸缩放）
    else if (this.pointers.size === 2) {
      this.lastPinchDistance = this.getPinchDistance();
    }
  }

  /**
   * 处理指针抬起事件（鼠标抬起或触摸结束）
   * @param event 指针事件对象
   */
  onPointerUp(event: PointerEvent) {
    // 处理中键抬起
    if (event.button === 1) {
      event.preventDefault();
      return;
    }

    // 忽略右键和其他按键
    if (event.button > 0) {
      return;
    }
    
    // 重置指针状态
    this.pointerDown = false;
    this.pointers.clear();

    // 检查是否按下修饰键（显示建造菜单）
    if (this.isModifierKeyPressed(event)) {
      this.eventBus.emit(new ShowBuildMenuEvent(event.clientX, event.clientY));
      return;
    }
    
    // 检查是否按下Alt键（显示表情菜单）
    if (this.isAltKeyPressed(event)) {
      this.eventBus.emit(new ShowEmojiMenuEvent(event.clientX, event.clientY));
      return;
    }

    // 计算指针移动距离，判断是否为点击操作
    const dist =
      Math.abs(event.x - this.lastPointerDownX) +
      Math.abs(event.y - this.lastPointerDownY);
    
    // 如果移动距离小于10像素，认为是点击操作
    if (dist < 10) {
      // 触摸设备上的点击显示右键菜单
      if (event.pointerType === "touch") {
        this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY));
        event.preventDefault();
        return;
      }

      // 根据用户设置和Shift键状态决定是发送点击事件还是右键菜单
      if (!this.userSettings.leftClickOpensMenu() || event.shiftKey) {
        this.eventBus.emit(new MouseUpEvent(event.x, event.y));
      } else {
        this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY));
      }
    }
  }

  /**
   * 处理滚轮事件（缩放操作）
   * @param event 滚轮事件对象
   */
  private onScroll(event: WheelEvent) {
    // 只有在没有按下Shift键时才处理缩放
    if (!event.shiftKey) {
      // 检查是否真正按下了Ctrl键（区分触控板缩放手势）
      const realCtrl =
        this.activeKeys.has("ControlLeft") ||
        this.activeKeys.has("ControlRight");
      
      // 触控板缩放手势的灵敏度补偿
      const ratio = event.ctrlKey && !realCtrl ? 10 : 1;
      this.eventBus.emit(new ZoomEvent(event.x, event.y, event.deltaY * ratio));
    }
  }

  /**
   * 处理Shift+滚轮事件（攻击比例调整）
   * @param event 滚轮事件对象
   */
  private onShiftScroll(event: WheelEvent) {
    if (event.shiftKey) {
      // 获取滚轮滚动值（支持水平和垂直滚动）
      const scrollValue = event.deltaY === 0 ? event.deltaX : event.deltaY;
      // 根据滚动方向确定攻击比例调整值
      const ratio = scrollValue > 0 ? -10 : 10;
      this.eventBus.emit(new AttackRatioEvent(ratio));
    }
  }

  /**
   * 处理触控板平移手势
   * @param event 滚轮事件对象
   * @returns 是否处理了平移手势
   */
  private onTrackpadPan(event: WheelEvent): boolean {
    // 如果按下修饰键，不处理平移
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      return false;
    }

    // 检查是否为触控板平移手势（deltaMode为0且有水平滚动）
    const isTrackpadPan = event.deltaMode === 0 && event.deltaX !== 0;

    if (!isTrackpadPan) {
      return false;
    }

    // 平移灵敏度设置
    const panSensitivity = 1.0;
    const deltaX = -event.deltaX * panSensitivity;
    const deltaY = -event.deltaY * panSensitivity;

    // 只有移动距离足够大时才发送拖拽事件（避免抖动）
    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      this.eventBus.emit(new DragEvent(deltaX, deltaY));
    }
    return true;
  }

  /**
   * 处理指针移动事件
   * @param event 指针事件对象
   */
  private onPointerMove(event: PointerEvent) {
    // 忽略中键移动
    if (event.button === 1) {
      event.preventDefault();
      return;
    }

    // 忽略右键和其他按键移动
    if (event.button > 0) {
      return;
    }

    // 更新指针信息
    this.pointers.set(event.pointerId, event);

    // 如果指针未按下，发送鼠标悬停事件
    if (!this.pointerDown) {
      this.eventBus.emit(new MouseOverEvent(event.clientX, event.clientY));
      return;
    }

    // 单指拖拽操作
    if (this.pointers.size === 1) {
      const deltaX = event.clientX - this.lastPointerX;
      const deltaY = event.clientY - this.lastPointerY;

      this.eventBus.emit(new DragEvent(deltaX, deltaY));

      // 更新上一次指针位置
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    } 
    // 双指缩放操作
    else if (this.pointers.size === 2) {
      const currentPinchDistance = this.getPinchDistance();
      const pinchDelta = currentPinchDistance - this.lastPinchDistance;

      // 只有缩放变化足够大时才处理（避免抖动）
      if (Math.abs(pinchDelta) > 1) {
        const zoomCenter = this.getPinchCenter();
        this.eventBus.emit(
          new ZoomEvent(zoomCenter.x, zoomCenter.y, -pinchDelta * 2),
        );
        this.lastPinchDistance = currentPinchDistance;
      }
    }
  }

  /**
   * 处理右键菜单事件
   * @param event 鼠标事件对象
   */
  private onContextMenu(event: MouseEvent) {
    event.preventDefault(); // 阻止浏览器默认右键菜单
    this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY));
  }

  /**
   * 处理触摸开始事件
   * @param event 触摸事件对象
   */
  private onTouchStart(event: TouchEvent) {
    // 双指触摸时的处理
    if (event.touches.length === 2) {
      event.preventDefault(); // 阻止默认行为
      
      // 解决屏幕抖动问题：计算双指中心点
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastPointerX = (touch1.clientX + touch2.clientX) / 2;
      this.lastPointerY = (touch1.clientY + touch2.clientY) / 2;
    }
  }

  /**
   * 处理触摸移动事件
   * @param event 触摸事件对象
   */
  private onTouchMove(event: TouchEvent) {
    // 双指触摸移动时的处理
    if (event.touches.length === 2) {
      event.preventDefault(); // 阻止默认行为

      // 计算当前双指中心点
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      // 如果有上一次的位置记录，计算移动增量
      if (this.lastPointerX !== 0 && this.lastPointerY !== 0) {
        const deltaX = centerX - this.lastPointerX;
        const deltaY = centerY - this.lastPointerY;

        // 只有移动距离足够大时才发送拖拽事件（避免抖动）
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          this.eventBus.emit(new DragEvent(deltaX, deltaY));
        }
      }

      // 更新上一次的中心点位置
      this.lastPointerX = centerX;
      this.lastPointerY = centerY;
    }
  }

  /**
   * 处理触摸结束事件
   * @param event 触摸事件对象
   */
  private onTouchEnd(event: TouchEvent) {
    // 当触摸点少于2个时，重置位置记录
    if (event.touches.length < 2) {
      this.lastPointerX = 0;
      this.lastPointerY = 0;
    }
  }

  /**
   * 计算双指间的距离（用于缩放计算）
   * @returns 双指间的像素距离
   */
  private getPinchDistance(): number {
    const pointerEvents = Array.from(this.pointers.values());
    const dx = pointerEvents[0].clientX - pointerEvents[1].clientX;
    const dy = pointerEvents[0].clientY - pointerEvents[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算双指的中心点（用作缩放中心）
   * @returns 包含x和y坐标的对象
   */
  private getPinchCenter(): { x: number; y: number } {
    const pointerEvents = Array.from(this.pointers.values());
    return {
      x: (pointerEvents[0].clientX + pointerEvents[1].clientX) / 2,
      y: (pointerEvents[0].clientY + pointerEvents[1].clientY) / 2,
    };
  }

  /**
   * 销毁输入处理器，清理资源
   */
  destroy() {
    // 清理定时器
    if (this.moveInterval !== null) {
      clearInterval(this.moveInterval);
    }
    
    // 清理U键相关的定时器
    if (this.uKeyPressTimer !== null) {
      clearTimeout(this.uKeyPressTimer);
    }
    
    if (this.uKeyHoldInterval !== null) {
      clearInterval(this.uKeyHoldInterval);
    }
    
    // 清空活动按键集合
    this.activeKeys.clear();
  }

  /**
   * 检查是否按下了修饰键（用于显示建造菜单）
   * @param event 指针事件对象
   * @returns 是否按下修饰键
   */
  isModifierKeyPressed(event: PointerEvent): boolean {
    return (
      (this.keybinds.modifierKey === "AltLeft" && event.altKey) ||
      (this.keybinds.modifierKey === "ControlLeft" && event.ctrlKey) ||
      (this.keybinds.modifierKey === "ShiftLeft" && event.shiftKey) ||
      (this.keybinds.modifierKey === "MetaLeft" && event.metaKey)
    );
  }

  /**
   * 检查是否按下了Alt键（用于显示表情菜单）
   * @param event 指针事件对象
   * @returns 是否按下Alt键
   */
  isAltKeyPressed(event: PointerEvent): boolean {
    return (
      (this.keybinds.altKey === "AltLeft" && event.altKey) ||
      (this.keybinds.altKey === "ControlLeft" && event.ctrlKey) ||
      (this.keybinds.altKey === "ShiftLeft" && event.shiftKey) ||
      (this.keybinds.altKey === "MetaLeft" && event.metaKey)
    );
  }
}
