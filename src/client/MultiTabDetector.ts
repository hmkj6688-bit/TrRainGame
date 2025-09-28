/**
 * 多标签页检测器
 * 
 * 这个类用于检测和防止用户在多个浏览器标签页中同时运行同一个应用程序。
 * 它通过localStorage实现标签页间的通信和锁机制，确保同一时间只有一个标签页
 * 处于活跃状态。当检测到多标签页时，会对非主标签页施加惩罚（延迟）。
 * 
 * 主要功能：
 * - 为每个标签页生成唯一ID
 * - 通过心跳机制维持标签页活跃状态
 * - 检测多标签页并施加惩罚
 * - 自动清理过期的锁信息
 * 
 * 使用场景：
 * - 防止用户在多个标签页中同时进行游戏
 * - 确保应用程序的单实例运行
 * - 避免多标签页导致的数据冲突
 */
export class MultiTabDetector {
  /** 当前标签页的唯一标识符，由时间戳和随机数组成，确保每个标签页都有独特的ID */
  private readonly tabId = `${Date.now()}-${Math.random()}`;
  
  /** localStorage中存储锁信息的键名，用于标签页间通信 */
  private readonly lockKey = "multi-tab-lock";
  
  /** 心跳间隔时间（毫秒），每1秒发送一次心跳信号来维持标签页活跃状态 */
  private readonly heartbeatIntervalMs = 1_000;
  
  /** 锁过期阈值（毫秒），超过3秒未更新的锁将被视为过期并可被其他标签页接管 */
  private readonly staleThresholdMs = 3_000;

  /** 心跳定时器的ID，用于控制心跳信号的发送 */
  private heartbeatTimer: number | null = null;
  
  /** 当前标签页是否处于惩罚状态，被惩罚的标签页会被延迟执行 */
  private isPunished = false;
  
  /** 惩罚次数计数器，记录当前标签页被惩罚的总次数 */
  private punishmentCount = 0;
  
  /** 开始惩罚的回调函数，当检测到多标签页时会调用此函数来施加延迟惩罚 */
  private startPenaltyCallback: (duration: number) => void = () => {};

  /**
   * 构造函数
   * 初始化多标签页检测器，设置必要的事件监听器
   * 
   * 监听的事件：
   * - storage事件：监听localStorage变化，检测其他标签页的活动
   * - beforeunload事件：在页面卸载前清理锁信息
   */
  constructor() {
    window.addEventListener("storage", this.onStorageEvent.bind(this));
    window.addEventListener("beforeunload", this.onBeforeUnload.bind(this));
  }

  /**
   * 开始监控多标签页
   * 启动心跳机制并设置惩罚回调函数
   * 
   * @param startPenalty 惩罚回调函数，当检测到多标签页时会被调用
   *                     参数duration表示惩罚持续时间（毫秒）
   * 
   * 工作流程：
   * 1. 保存惩罚回调函数
   * 2. 写入当前标签页的锁信息
   * 3. 启动定时心跳，定期更新锁信息
   */
  public startMonitoring(startPenalty: (duration: number) => void): void {
    this.startPenaltyCallback = startPenalty;
    this.writeLock();
    this.heartbeatTimer = window.setInterval(
      () => this.heartbeat(),
      this.heartbeatIntervalMs,
    );
  }

  /**
   * 停止监控多标签页
   * 清理定时器、移除锁信息和事件监听器
   * 
   * 清理步骤：
   * 1. 清除心跳定时器，停止定期更新
   * 2. 如果当前标签页拥有锁，则从localStorage中移除锁信息
   * 3. 移除storage和beforeunload事件监听器
   * 
   * 注意：只有锁的拥有者才能移除锁，防止其他标签页误删锁信息
   */
  public stopMonitoring(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const lock = this.readLock();
    if (lock?.owner === this.tabId) {
      localStorage.removeItem(this.lockKey);
    }
    window.removeEventListener("storage", this.onStorageEvent.bind(this));
    window.removeEventListener("beforeunload", this.onBeforeUnload.bind(this));
  }

  /**
   * 心跳检测方法
   * 定期执行以维持当前标签页的活跃状态并检测多标签页情况
   * 
   * 检测逻辑：
   * 1. 获取当前时间和锁信息
   * 2. 如果满足以下任一条件，则当前标签页可以获得/保持锁：
   *    - 没有锁存在
   *    - 当前标签页已经拥有锁
   *    - 现有锁已过期（超过staleThresholdMs）
   * 3. 如果不满足上述条件且当前标签页未被惩罚，则施加惩罚
   * 
   * 这种机制确保了：
   * - 只有一个标签页能够保持活跃状态
   * - 过期的锁会被自动清理和接管
   * - 多标签页会被及时检测并惩罚
   */
  private heartbeat(): void {
    const now = Date.now();
    const lock = this.readLock();

    if (
      !lock ||
      lock.owner === this.tabId ||
      now - lock.timestamp > this.staleThresholdMs
    ) {
      this.writeLock();
      this.isPunished = false;
      return;
    }

    if (!this.isPunished) {
      this.applyPunishment();
    }
  }

  /**
   * localStorage存储事件监听器
   * 监听其他标签页对锁信息的修改，实现标签页间的实时通信
   * 
   * @param e 存储事件对象，包含键名、新值等信息
   * 
   * 处理逻辑：
   * 1. 检查事件是否与锁键相关且有新值
   * 2. 尝试解析新的锁信息（JSON格式）
   * 3. 如果锁的拥有者不是当前标签页且当前标签页未被惩罚，则施加惩罚
   * 
   * 这个方法确保了当其他标签页获得锁时，当前标签页能够立即感知并做出响应
   * 而不需要等待下一次心跳检测，提高了多标签页检测的实时性
   */
  private onStorageEvent(e: StorageEvent): void {
    if (e.key === this.lockKey && e.newValue) {
      let other: { owner: string; timestamp: number };
      try {
        other = JSON.parse(e.newValue);
      } catch (e) {
        console.error("Failed to parse lock", e);
        return;
      }
      if (other.owner !== this.tabId && !this.isPunished) {
        this.applyPunishment();
      }
    }
  }

  /**
   * 页面卸载前的清理方法
   * 在用户关闭标签页或刷新页面时自动清理锁信息
   * 
   * 清理逻辑：
   * 1. 读取当前的锁信息
   * 2. 如果当前标签页是锁的拥有者，则从localStorage中移除锁
   * 
   * 这确保了当用户关闭标签页时，锁能够被及时释放，
   * 避免其他标签页需要等待锁过期才能获得控制权
   */
  private onBeforeUnload(): void {
    const lock = this.readLock();
    if (lock?.owner === this.tabId) {
      localStorage.removeItem(this.lockKey);
    }
  }

  /**
   * 施加惩罚方法
   * 当检测到多标签页时对当前标签页施加延迟惩罚
   * 
   * 惩罚机制：
   * 1. 将当前标签页标记为已惩罚状态
   * 2. 增加惩罚次数计数器
   * 3. 设置固定的惩罚延迟时间（10秒）
   * 4. 调用惩罚回调函数，通知上层应用施加延迟
   * 5. 设置定时器，在惩罚时间结束后恢复正常状态
   * 
   * 惩罚的目的是让非主标签页的用户体验到延迟，
   * 从而鼓励用户只使用一个标签页进行操作
   */
  private applyPunishment(): void {
    this.isPunished = true;
    this.punishmentCount++;
    const delay = 10_000; // 惩罚延迟时间：10秒
    this.startPenaltyCallback(delay);
    setTimeout(() => {
      this.isPunished = false;
    }, delay);
  }

  /**
   * 写入锁信息到localStorage
   * 将当前标签页的锁信息存储到localStorage中，声明对应用的控制权
   * 
   * 锁信息结构：
   * - owner: 当前标签页的唯一ID
   * - timestamp: 当前时间戳，用于判断锁是否过期
   * 
   * 这个方法在以下情况下被调用：
   * - 开始监控时建立初始锁
   * - 心跳检测时更新锁的时间戳
   * - 从其他标签页接管过期的锁
   */
  private writeLock(): void {
    localStorage.setItem(
      this.lockKey,
      JSON.stringify({ owner: this.tabId, timestamp: Date.now() }),
    );
  }

  /**
   * 从localStorage读取锁信息
   * 获取当前存储的锁信息，用于判断哪个标签页拥有控制权
   * 
   * @returns 锁信息对象，包含owner和timestamp，如果没有锁或解析失败则返回null
   * 
   * 返回值说明：
   * - owner: 拥有锁的标签页ID
   * - timestamp: 锁的创建/更新时间戳
   * - null: 没有锁存在或JSON解析失败
   * 
   * 错误处理：
   * 如果localStorage中的锁信息格式不正确，会记录错误并返回null，
   * 这样可以让其他标签页有机会创建新的有效锁
   */
  private readLock(): { owner: string; timestamp: number } | null {
    const raw = localStorage.getItem(this.lockKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse lock", raw, e);
      return null;
    }
  }
}
