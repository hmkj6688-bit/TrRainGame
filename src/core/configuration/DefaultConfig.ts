// 导入 JSON Web Key 相关类型
import { JWK } from "jose";
// 导入 Zod 验证库
import { z } from "zod";
// 导入游戏核心类型定义
import {
  Difficulty,
  Duos,
  Game,
  GameMapType,
  GameMode,
  GameType,
  Gold,
  Player,
  PlayerInfo,
  PlayerType,
  Quads,
  TerrainType,
  TerraNullius,
  Tick,
  Trios,
  UnitInfo,
  UnitType,
} from "../game/Game";
// 导入地图瓦片引用类型
import { TileRef } from "../game/GameMap";
// 导入玩家视图类型
import { PlayerView } from "../game/GameView";
// 导入用户设置类型
import { UserSettings } from "../game/UserSettings";
// 导入游戏配置和相关模式类型
import { GameConfig, GameID, TeamCountConfig } from "../Schemas";
// 导入核武器类型
import { NukeType } from "../StatsSchemas";
// 导入工具函数
import { assertNever, sigmoid, simpleHash, within } from "../Util";
// 导入配置接口和相关类型
import { Config, GameEnv, NukeMagnitude, ServerConfig, Theme } from "./Config";
// 导入主题配置
import { PastelTheme } from "./PastelTheme";
import { PastelThemeDark } from "./PastelThemeDark";

// 防御减益效果的中点值（150,000 个瓦片）
const DEFENSE_DEBUFF_MIDPOINT = 150_000;
// 防御减益效果的衰减率
const DEFENSE_DEBUFF_DECAY_RATE = Math.LN2 / 50000;

// JSON Web Key Set 验证模式
const JwksSchema = z.object({
  keys: z
    .object({
      alg: z.literal("EdDSA"), // 算法类型
      crv: z.literal("Ed25519"), // 椭圆曲线类型
      kty: z.literal("OKP"), // 密钥类型
      x: z.string(), // 公钥 x 坐标
    })
    .array()
    .min(1),
});

// 各地图类型的玩家数量配置 [大型, 中型, 小型]
const numPlayersConfig = {
  [GameMapType.Africa]: [100, 70, 50],
  [GameMapType.Asia]: [50, 40, 30],
  [GameMapType.Australia]: [70, 40, 30],
  [GameMapType.Baikal]: [100, 70, 50],
  [GameMapType.BetweenTwoSeas]: [70, 50, 40],
  [GameMapType.BlackSea]: [50, 30, 30],
  [GameMapType.Britannia]: [50, 30, 20],
  [GameMapType.DeglaciatedAntarctica]: [50, 40, 30],
  [GameMapType.EastAsia]: [50, 30, 20],
  [GameMapType.Europe]: [100, 70, 50],
  [GameMapType.EuropeClassic]: [50, 30, 30],
  [GameMapType.FalklandIslands]: [50, 30, 20],
  [GameMapType.FaroeIslands]: [20, 15, 10],
  [GameMapType.GatewayToTheAtlantic]: [100, 70, 50],
  [GameMapType.GiantWorldMap]: [100, 70, 50],
  [GameMapType.Halkidiki]: [100, 50, 40],
  [GameMapType.Iceland]: [50, 40, 30],
  [GameMapType.Italia]: [50, 30, 20],
  [GameMapType.Mars]: [70, 40, 30],
  [GameMapType.Mena]: [70, 50, 40],
  [GameMapType.Montreal]: [60, 40, 30],
  [GameMapType.NorthAmerica]: [70, 40, 30],
  [GameMapType.Oceania]: [10, 10, 10],
  [GameMapType.Pangaea]: [20, 15, 10],
  [GameMapType.Pluto]: [100, 70, 50],
  [GameMapType.SouthAmerica]: [70, 50, 40],
  [GameMapType.StraitOfGibraltar]: [100, 70, 50],
  [GameMapType.World]: [50, 30, 20],
  [GameMapType.Yenisei]: [150, 100, 70],
} as const satisfies Record<GameMapType, [number, number, number]>;

// 默认服务器配置抽象类
export abstract class DefaultServerConfig implements ServerConfig {
  // 获取允许的信号弹类型
  allowedFlares(): string[] | undefined {
    return;
  }
  // 获取 Stripe 支付系统的公钥
  stripePublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  }
  // 获取主域名
  domain(): string {
    return process.env.DOMAIN ?? "";
  }
  // 获取子域名
  subdomain(): string {
    return process.env.SUBDOMAIN ?? "";
  }
  // 获取 Cloudflare 账户 ID
  cloudflareAccountId(): string {
    return process.env.CF_ACCOUNT_ID ?? "";
  }
  // 获取 Cloudflare API 令牌
  cloudflareApiToken(): string {
    return process.env.CF_API_TOKEN ?? "";
  }
  // 获取 Cloudflare 配置文件路径
  cloudflareConfigPath(): string {
    return process.env.CF_CONFIG_PATH ?? "";
  }
  // 获取 Cloudflare 凭证文件路径
  cloudflareCredsPath(): string {
    return process.env.CF_CREDS_PATH ?? "";
  }

  // 缓存的公钥
  private publicKey: JWK;
  // 抽象方法：获取 JWT 受众
  abstract jwtAudience(): string;
  // 获取 JWT 发行者
  jwtIssuer(): string {
    const audience = this.jwtAudience();
    return audience === "localhost"
      ? "http://localhost:8787"
      : `https://api.${audience}`;
  }
  // 异步获取 JWK 公钥
  async jwkPublicKey(): Promise<JWK> {
    if (this.publicKey) return this.publicKey;
    const jwksUrl = this.jwtIssuer() + "/.well-known/jwks.json";
    console.log(`Fetching JWKS from ${jwksUrl}`);
    const response = await fetch(jwksUrl);
    const result = JwksSchema.safeParse(await response.json());
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Error parsing JWKS", error);
      throw new Error("Invalid JWKS");
    }
    this.publicKey = result.data.keys[0];
    return this.publicKey;
  }
  // 检查是否启用 OpenTelemetry 遥测
  otelEnabled(): boolean {
    return (
      this.env() !== GameEnv.Dev &&
      Boolean(this.otelEndpoint()) &&
      Boolean(this.otelAuthHeader())
    );
  }
  // 获取 OpenTelemetry 端点
  otelEndpoint(): string {
    return process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "";
  }
  // 获取 OpenTelemetry 认证头
  otelAuthHeader(): string {
    return process.env.OTEL_AUTH_HEADER ?? "";
  }
  // 获取 Git 提交哈希
  gitCommit(): string {
    return process.env.GIT_COMMIT ?? "";
  }
  // 获取 R2 存储端点
  r2Endpoint(): string {
    return `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  // 获取 R2 访问密钥
  r2AccessKey(): string {
    return process.env.R2_ACCESS_KEY ?? "";
  }
  // 获取 R2 秘密密钥
  r2SecretKey(): string {
    return process.env.R2_SECRET_KEY ?? "";
  }

  // 获取 R2 存储桶名称
  r2Bucket(): string {
    return process.env.R2_BUCKET ?? "";
  }

  // 获取 API 密钥
  apiKey(): string {
    return process.env.API_KEY ?? "";
  }

  // 获取管理员请求头名称
  adminHeader(): string {
    return "x-admin-key";
  }
  // 获取管理员令牌
  adminToken(): string {
    return process.env.ADMIN_TOKEN ?? "dummy-admin-token";
  }
  // 抽象方法：获取工作进程数量
  abstract numWorkers(): number;
  // 抽象方法：获取游戏环境
  abstract env(): GameEnv;
  // 获取回合间隔时间（毫秒）
  turnIntervalMs(): number {
    return 100;
  }
  // 获取游戏创建频率（毫秒）
  gameCreationRate(): number {
    return 60 * 1000;
  }

  // 计算大厅最大玩家数量
  lobbyMaxPlayers(
    map: GameMapType,
    mode: GameMode,
    numPlayerTeams: TeamCountConfig | undefined,
  ): number {
    const [l, m, s] = numPlayersConfig[map] ?? [50, 30, 20];
    const r = Math.random();
    const base = r < 0.3 ? l : r < 0.6 ? m : s;
    let p = Math.min(mode === GameMode.Team ? Math.ceil(base * 1.5) : base, l);
    if (numPlayerTeams === undefined) return p;
    switch (numPlayerTeams) {
      case Duos:
        p -= p % 2;
        break;
      case Trios:
        p -= p % 3;
        break;
      case Quads:
        p -= p % 4;
        break;
      default:
        p -= p % numPlayerTeams;
        break;
    }
    return p;
  }

  // 根据游戏 ID 计算工作进程索引
  workerIndex(gameID: GameID): number {
    return simpleHash(gameID) % this.numWorkers();
  }
  // 根据游戏 ID 获取工作进程路径
  workerPath(gameID: GameID): string {
    return `w${this.workerIndex(gameID)}`;
  }
  // 根据游戏 ID 获取工作进程端口
  workerPort(gameID: GameID): number {
    return this.workerPortByIndex(this.workerIndex(gameID));
  }
  // 根据索引获取工作进程端口
  workerPortByIndex(index: number): number {
    return 3001 + index;
  }
}

// 默认游戏配置类
export class DefaultConfig implements Config {
  // 浅色主题实例
  private pastelTheme: PastelTheme = new PastelTheme();
  // 深色主题实例
  private pastelThemeDark: PastelThemeDark = new PastelThemeDark();
  // 构造函数
  constructor(
    private _serverConfig: ServerConfig,
    private _gameConfig: GameConfig,
    private _userSettings: UserSettings | null,
    private _isReplay: boolean,
  ) {}

  // 获取 Stripe 支付系统的公钥
  stripePublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  }

  // 检查是否为回放模式
  isReplay(): boolean {
    return this._isReplay;
  }

  // SAM 导弹命中概率
  samHittingChance(): number {
    return 0.8;
  }

  // SAM 弹头命中概率
  samWarheadHittingChance(): number {
    return 0.5;
  }

  // 叛徒防御减益
  traitorDefenseDebuff(): number {
    return 0.5;
  }
  // 叛徒速度减益
  traitorSpeedDebuff(): number {
    return 0.8;
  }
  // 叛徒状态持续时间
  traitorDuration(): number {
    return 30 * 10; // 30 seconds
  }
  // 出生免疫持续时间
  spawnImmunityDuration(): Tick {
    return 60 * 10;
  }

  // 获取游戏配置
  gameConfig(): GameConfig {
    return this._gameConfig;
  }

  // 获取服务器配置
  serverConfig(): ServerConfig {
    return this._serverConfig;
  }

  // 获取用户设置
  userSettings(): UserSettings {
    if (this._userSettings === null) {
      throw new Error("userSettings is null");
    }
    return this._userSettings;
  }

  // 难度修正系数
  difficultyModifier(difficulty: Difficulty): number {
    switch (difficulty) {
      case Difficulty.Easy:
        return 1;
      case Difficulty.Medium:
        return 3;
      case Difficulty.Hard:
        return 9;
      case Difficulty.Impossible:
        return 18;
    }
  }

  // 城市部队增长量
  cityTroopIncrease(): number {
    return 500_000;
  }

  // 辐射尘防御修正系数
  falloutDefenseModifier(falloutRatio: number): number {
    // falloutRatio is between 0 and 1
    // So defense modifier is between [5, 2.5]
    return 5 - falloutRatio * 2;
  }
  // SAM 冷却时间
  SAMCooldown(): number {
    return 75;
  }
  // 导弹发射井冷却时间
  SiloCooldown(): number {
    return 75;
  }

  // 防御哨所射程
  defensePostRange(): number {
    return 90;
  }

  // 防御哨所防御加成
  defensePostDefenseBonus(): number {
    return 20;
  }

  // 防御哨所速度加成
  defensePostSpeedBonus(): number {
    return 3;
  }

  // 获取玩家队伍配置
  playerTeams(): TeamCountConfig {
    return this._gameConfig.playerTeams ?? 0;
  }

  // 是否生成 NPC
  spawnNPCs(): boolean {
    return !this._gameConfig.disableNPCs;
  }

  // 检查单位是否被禁用
  isUnitDisabled(unitType: UnitType): boolean {
    return this._gameConfig.disabledUnits?.includes(unitType) ?? false;
  }

  // 机器人数量
  bots(): number {
    return this._gameConfig.bots;
  }
  // 即时建造模式
  instantBuild(): boolean {
    return this._gameConfig.instantBuild;
  }
  // 无限金币模式
  infiniteGold(): boolean {
    return this._gameConfig.infiniteGold;
  }
  // 金币捐赠功能
  donateGold(): boolean {
    return this._gameConfig.donateGold;
  }
  // 无限部队模式
  infiniteTroops(): boolean {
    return this._gameConfig.infiniteTroops;
  }
  // 部队捐赠功能
  donateTroops(): boolean {
    return this._gameConfig.donateTroops;
  }

  // 火车生成间隔时间（基于玩家工厂数量的双曲线衰减算法）
  trainSpawnRate(numPlayerFactories: number): number {
    // 双曲线衰减算法，在10个工厂时达到中点
    // 预期火车数量 = 工厂数量 / 火车生成间隔时间
    return (numPlayerFactories + 1) * 20;
  }
  // 火车站金币奖励（基于玩家关系类型分配不同奖励）
  trainGold(rel: "self" | "team" | "ally" | "other"): Gold {
    switch (rel) {
      case "ally":
        return 100_000n; // 盟友：50,000金币（最高奖励，鼓励结盟合作）
      case "team":
      case "other":
        return 50_000n; // 队友/其他玩家：25,000金币（中等奖励）
      case "self":
        return 20_000n; // 自己：10,000金币（最低奖励，防止自我刷金币）
    }
  }

  // 火车站最小射程
  trainStationMinRange(): number {
    return 15;
  }
  // 火车站最大射程
  trainStationMaxRange(): number {
    return 100;
  }
  // 铁路最大长度
  railroadMaxSize(): number {
    return 120;
  }

  // 贸易船金币收益计算（基于航行距离和港口数量的复合奖励机制）
  tradeShipGold(dist: number, numPorts: number): Gold {
    const baseGold = Math.floor(100_000 + 100 * dist); // 基础金币：10万 + 距离×100
    const numPortBonus = numPorts - 1; // 港口奖励数量（减去基础1个港口）
    // 双曲线衰减算法：在5个港口时达到中点，最大3倍奖励
    const bonus = 1 + 2 * (numPortBonus / (numPortBonus + 5));
    return BigInt(Math.floor(baseGold * bonus));
  }

  // 贸易船生成速率计算（返回值越大生成概率越低，概率 = 1 / tradeShipSpawnRate）
  tradeShipSpawnRate(
    numTradeShips: number, // 全局贸易船总数
    numPlayerPorts: number, // 玩家港口数量
    numPlayerTradeShips: number, // 玩家贸易船数量
  ): number {
    // 使用几何平均数结合基础生成率和港口倍数
    const combined = Math.sqrt(
      this.tradeShipBaseSpawn(numTradeShips, numPlayerTradeShips) *
        this.tradeShipPortMultiplier(numPlayerPorts),
    );

    return Math.floor(25 / combined); // 最终生成间隔 = 25 / 综合系数
  }

  // 贸易船基础生成率计算（防止小玩家被完全压制的保护机制）
  private tradeShipBaseSpawn(
    numTradeShips: number, // 全局贸易船总数
    numPlayerTradeShips: number, // 玩家贸易船数量
  ): number {
    if (numPlayerTradeShips < 3) {
      // 如果其他玩家拥有大量港口，可能会完全压制小玩家
      // 此机制防止小玩家被完全饿死，保证最低生成率
      return 1;
    }
    const decayRate = Math.LN2 / 10; // 衰减率：ln(2)/10 ≈ 0.0693
    return 1 - sigmoid(numTradeShips, decayRate, 55); // S型衰减函数，55为中点
  }

  // 贸易船港口倍数计算（双曲线衰减防止港口过多导致生成率下降）
  private tradeShipPortMultiplier(numPlayerPorts: number): number {
    // 双曲线衰减函数，在10个港口时达到中点
    // 预期贸易船生成率与 港口数量 × 倍数 成正比
    // 渐进衰减防止"港口越多，船越少"的反直觉现象
    const decayRate = 1 / 10; // 衰减率：0.1
    return 1 / (1 + decayRate * numPlayerPorts); // 倍数 = 1 / (1 + 0.1 × 港口数)
  }



  // 获取单位信息（成本、属性等）
  unitInfo(type: UnitType): UnitInfo {
    switch (type) {
      case UnitType.TransportShip:
        // 运输船：免费，不受领土限制
        return {
          cost: () => 0n,
          territoryBound: false,
        };
      case UnitType.Warship:
        // 战舰：成本递增，最大生命值1000
        return {
          cost: this.costWrapper(
            (numUnits: number) => Math.min(1_000_000, (numUnits + 1) * 250_000),
            UnitType.Warship,
          ),
          territoryBound: false,
          maxHealth: 1000,
        };
      case UnitType.Shell:
        // 炮弹：免费，伤害250
        return {
          cost: () => 0n,
          territoryBound: false,
          damage: 250,
        };
      case UnitType.SAMMissile:
        // SAM 导弹：免费，不受领土限制
        return {
          cost: () => 0n,
          territoryBound: false,
        };
      case UnitType.Port:
        // 港口：成本指数增长，可建造火车站
        return {
          cost: this.costWrapper(
            (numUnits: number) =>
              Math.min(1_000_000, Math.pow(2, numUnits) * 125_000),
            UnitType.Port,
            UnitType.Factory,
          ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 2 * 10,
          upgradable: true,
          canBuildTrainStation: true,
        };
      case UnitType.AtomBomb:
        // 原子弹：固定成本75万
        return {
          cost: this.costWrapper(() => 750_000, UnitType.AtomBomb),
          territoryBound: false,
        };
      case UnitType.HydrogenBomb:
        // 氢弹：固定成本500万
        return {
          cost: this.costWrapper(() => 5_000_000, UnitType.HydrogenBomb),
          territoryBound: false,
        };
      case UnitType.MIRV:
        // 多弹头导弹：固定成本3500万
        return {
          cost: this.costWrapper(() => 35_000_000, UnitType.MIRV),
          territoryBound: false,
        };
      case UnitType.MIRVWarhead:
        // MIRV 弹头：免费，不受领土限制
        return {
          cost: () => 0n,
          territoryBound: false,
        };
      case UnitType.TradeShip:
        // 贸易船：免费，不受领土限制
        return {
          cost: () => 0n,
          territoryBound: false,
        };
      case UnitType.MissileSilo:
        // 导弹发射井：固定成本100万，建造时间10秒
        return {
          cost: this.costWrapper(() => 1_000_000, UnitType.MissileSilo),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 10 * 10,
          upgradable: true,
        };
      case UnitType.DefensePost:
        // 防御哨所：成本递增，建造时间5秒
        return {
          cost: this.costWrapper(
            (numUnits: number) => Math.min(250_000, (numUnits + 1) * 50_000),
            UnitType.DefensePost,
          ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 5 * 10,
        };
      case UnitType.SAMLauncher:
        // SAM 发射器：成本递增，建造时间30秒
        return {
          cost: this.costWrapper(
            (numUnits: number) =>
              Math.min(3_000_000, (numUnits + 1) * 1_500_000),
            UnitType.SAMLauncher,
          ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 30 * 10,
          upgradable: true,
        };
      case UnitType.City:
        // 城市：成本指数增长，可建造火车站
        return {
          cost: this.costWrapper(
            (numUnits: number) =>
              Math.min(1_000_000, Math.pow(2, numUnits) * 125_000),
            UnitType.City,
          ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 2 * 10,
          upgradable: true,
          canBuildTrainStation: true,
        };
      case UnitType.Factory:
        // 工厂：成本指数增长，实验性功能
        return {
          cost: this.costWrapper(
            (numUnits: number) =>
              Math.min(1_000_000, Math.pow(2, numUnits) * 125_000),
            UnitType.Factory,
            UnitType.Port,
          ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 2 * 10,
          canBuildTrainStation: true,
          experimental: true,
          upgradable: true,
        };
      case UnitType.Construction:
        // 建筑中：免费，受领土限制
        return {
          cost: () => 0n,
          territoryBound: true,
        };
      case UnitType.Train:
        // 火车：免费，实验性功能
        return {
          cost: () => 0n,
          territoryBound: false,
          experimental: true,
        };
      default:
        assertNever(type);
    }
  }

  // 成本包装器（处理无限金币模式和单位数量计算）
  private costWrapper(
    costFn: (units: number) => number,
    ...types: UnitType[]
  ): (p: Player) => bigint {
    return (p: Player) => {
      // 人类玩家在无限金币模式下免费
      if (p.type() === PlayerType.Human && this.infiniteGold()) {
        return 0n;
      }
      // 计算已拥有和已建造的单位总数
      const numUnits = types.reduce(
        (acc, type) =>
          acc + Math.min(p.unitsOwned(type), p.unitsConstructed(type)),
        0,
      );
      return BigInt(costFn(numUnits));
    };
  }

  // 默认捐赠数量（发送者部队的1/3）
  defaultDonationAmount(sender: Player): number {
    return Math.floor(sender.troops() / 3);
  }
  // 捐赠冷却时间
  donateCooldown(): Tick {
    return 10 * 10;
  }
  // 删除单位冷却时间
  deleteUnitCooldown(): Tick {
    return 5 * 10;
  }
  // 表情消息持续时间
  emojiMessageDuration(): Tick {
    return 5 * 10;
  }
  // 表情消息冷却时间
  emojiMessageCooldown(): Tick {
    return 5 * 10;
  }
  // 目标标记持续时间
  targetDuration(): Tick {
    return 10 * 10;
  }
  // 目标标记冷却时间
  targetCooldown(): Tick {
    return 15 * 10;
  }
  // 联盟请求持续时间
  allianceRequestDuration(): Tick {
    return 20 * 10;
  }
  // 联盟请求冷却时间
  allianceRequestCooldown(): Tick {
    return 30 * 10;
  }
  // 联盟持续时间（5分钟）
  allianceDuration(): Tick {
    return 300 * 10; // 5 minutes.
  }
  // 临时禁运持续时间（5分钟）
  temporaryEmbargoDuration(): Tick {
    return 300 * 10; // 5 minutes.
  }

  // 获胜所需的领土占有百分比
  percentageTilesOwnedToWin(): number {
    if (this._gameConfig.gameMode === GameMode.Team) {
      return 95;
    }
    return 80;
  }
  // 船只最大数量
  boatMaxNumber(): number {
    return 10;
  }
  // 出生阶段回合数（玩家选择出生位置的准备时间）
  numSpawnPhaseTurns(): number {
    // 单人游戏：300回合（30秒），多人游戏：600回合（60秒）
    return this._gameConfig.gameType === GameType.Singleplayer ? 300 : 600;
  }
  // 机器人数量
  numBots(): number {
    return this.bots();
  }
  // 主题设置（根据用户设置选择明暗主题）
  theme(): Theme {
    return this.userSettings()?.darkMode()
      ? this.pastelThemeDark
      : this.pastelTheme;
  }

  // 攻击逻辑（计算攻击者和防御者的损失）
  attackLogic(
    gm: Game,
    attackTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    tileToConquer: TileRef,
  ): {
    attackerTroopLoss: number;
    defenderTroopLoss: number;
    tilesPerTickUsed: number;
  } {
    let mag = 0;
    let speed = 0;
    // 根据地形类型设置攻击参数
    const type = gm.terrainType(tileToConquer);
    switch (type) {
      case TerrainType.Plains:
        // 平原：攻击力80，速度16.5
        mag = 80;
        speed = 16.5;
        break;
      case TerrainType.Highland:
        // 高地：攻击力100，速度20
        mag = 100;
        speed = 20;
        break;
      case TerrainType.Mountain:
        // 山地：攻击力120，速度25
        mag = 120;
        speed = 25;
        break;
      default:
        throw new Error(`terrain type ${type} not supported`);
    }
    if (defender.isPlayer()) {
      // 检查附近是否有防御哨所，如果有则应用防御加成
      for (const dp of gm.nearbyUnits(
        tileToConquer,
        gm.config().defensePostRange(),
        UnitType.DefensePost,
      )) {
        if (dp.unit.owner() === defender) {
          // 应用防御哨所的防御和速度加成
          mag *= this.defensePostDefenseBonus();
          speed *= this.defensePostSpeedBonus();
          break;
        }
      }
    }

    if (gm.hasFallout(tileToConquer)) {
      // 如果目标区域有辐射，计算辐射对防御的影响
      const falloutRatio = gm.numTilesWithFallout() / gm.numLandTiles();
      mag *= this.falloutDefenseModifier(falloutRatio);
      speed *= this.falloutDefenseModifier(falloutRatio);
    }

    if (attacker.isPlayer() && defender.isPlayer()) {
      if (
        attacker.type() === PlayerType.Human &&
        defender.type() === PlayerType.Bot
      ) {
        // 人类玩家攻击机器人时攻击力减少20%
        mag *= 0.8;
      }
      if (
        attacker.type() === PlayerType.FakeHuman &&
        defender.type() === PlayerType.Bot
      ) {
        // 假人类玩家攻击机器人时攻击力减少20%
        mag *= 0.8;
      }
    }

    if (defender.isPlayer()) {
      // 计算大型防御者的防御减益
      const defenseSig =
        1 -
        sigmoid(
          defender.numTilesOwned(),
          DEFENSE_DEBUFF_DECAY_RATE,
          DEFENSE_DEBUFF_MIDPOINT,
        );

      // 大型防御者的速度和攻击减益
      const largeDefenderSpeedDebuff = 0.7 + 0.3 * defenseSig;
      const largeDefenderAttackDebuff = 0.7 + 0.3 * defenseSig;

      // 大型攻击者的攻击加成
      let largeAttackBonus = 1;
      if (attacker.numTilesOwned() > 100_000) {
        largeAttackBonus = Math.sqrt(100_000 / attacker.numTilesOwned()) ** 0.7;
      }
      // 大型攻击者的速度加成
      let largeAttackerSpeedBonus = 1;
      if (attacker.numTilesOwned() > 100_000) {
        largeAttackerSpeedBonus = (100_000 / attacker.numTilesOwned()) ** 0.6;
      }

      return {
        // 攻击者部队损失计算
        attackerTroopLoss:
          within(defender.troops() / attackTroops, 0.6, 2) *
          mag *
          0.8 *
          largeDefenderAttackDebuff *
          largeAttackBonus *
          (defender.isTraitor() ? this.traitorDefenseDebuff() : 1),
        // 防御者部队损失计算
        defenderTroopLoss: defender.troops() / defender.numTilesOwned(),
        // 每tick使用的瓦片数量
        tilesPerTickUsed:
          within(defender.troops() / (5 * attackTroops), 0.2, 1.5) *
          speed *
          largeDefenderSpeedDebuff *
          largeAttackerSpeedBonus *
          (defender.isTraitor() ? this.traitorSpeedDebuff() : 1),
      };
    } else {
      return {
        // 攻击中立区域时的部队损失
        attackerTroopLoss:
          attacker.type() === PlayerType.Bot ? mag / 10 : mag / 5,
        defenderTroopLoss: 0,
        // 攻击中立区域时每tick使用的瓦片数量
        tilesPerTickUsed: within(
          (2000 * Math.max(10, speed)) / attackTroops,
          5,
          100,
        ),
      };
    }
  }

  // 计算每tick攻击的瓦片数量
  attackTilesPerTick(
    attackTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    numAdjacentTilesWithEnemy: number,
  ): number {
    if (defender.isPlayer()) {
      // 攻击玩家时的瓦片攻击速度
      return (
        within(((5 * attackTroops) / defender.troops()) * 2, 0.01, 0.5) *
        numAdjacentTilesWithEnemy *
        3
      );
    } else {
      // 攻击中立区域时的瓦片攻击速度
      return numAdjacentTilesWithEnemy * 2;
    }
  }

  // 计算船只攻击数量
  boatAttackAmount(attacker: Player, defender: Player | TerraNullius): number {
    return Math.floor(attacker.troops() / 5);
  }

  // 战舰炮弹生存时间（以tick为单位，1 tick = 100ms）
  warshipShellLifetime(): number {
    return 20; // in ticks (one tick is 100ms)
  }

  // 港口生成半径
  radiusPortSpawn() {
    return 20;
  }

  // 计算邻近加成港口数量
  proximityBonusPortsNb(totalPorts: number) {
    return within(totalPorts / 3, 4, totalPorts);
  }

  // 计算攻击数量
  attackAmount(attacker: Player, defender: Player | TerraNullius) {
    if (attacker.type() === PlayerType.Bot) {
      // 机器人攻击者的攻击数量
      return attacker.troops() / 20;
    } else {
      // 其他类型攻击者的攻击数量
      return attacker.troops() / 5;
    }
  }

  // 计算玩家初始兵力
  startManpower(playerInfo: PlayerInfo): number {
    if (playerInfo.playerType === PlayerType.Bot) {
      // 机器人玩家初始兵力
      return 10_000;
    }
    if (playerInfo.playerType === PlayerType.FakeHuman) {
      // 假人类玩家根据难度设置初始兵力
      switch (this._gameConfig.difficulty) {
        case Difficulty.Easy:
          return 2_500 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Medium:
          return 5_000 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Hard:
          return 20_000 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Impossible:
          return 50_000 * (playerInfo?.nation?.strength ?? 1);
      }
    }
    // 人类玩家初始兵力（无限部队模式下为100万，否则为2.5万）
    return this.infiniteTroops() ? 1_000_000 : 25_000;
  }

  // 计算玩家最大部队数量
  maxTroops(player: Player | PlayerView): number {
    const maxTroops =
      player.type() === PlayerType.Human && this.infiniteTroops()
        ? 1_000_000_000 // 人类玩家在无限部队模式下的最大值
        : 2 * (Math.pow(player.numTilesOwned(), 0.6) * 1000 + 50000) +
          player
            .units(UnitType.City)
            .map((city) => city.level())
            .reduce((a, b) => a + b, 0) *
            this.cityTroopIncrease();

    if (player.type() === PlayerType.Bot) {
      // 机器人玩家的最大部队数量为计算值的1/3
      return maxTroops / 3;
    }

    if (player.type() === PlayerType.Human) {
      // 人类玩家使用完整的计算值
      return maxTroops;
    }

    // 假人类玩家根据难度调整最大部队数量
    switch (this._gameConfig.difficulty) {
      case Difficulty.Easy:
        return maxTroops * 0.5;
      case Difficulty.Medium:
        return maxTroops * 1;
      case Difficulty.Hard:
        return maxTroops * 1.5;
      case Difficulty.Impossible:
        return maxTroops * 2;
    }
  }

  // 计算部队增长率
  troopIncreaseRate(player: Player): number {
    const max = this.maxTroops(player);

    // 基础增长计算
    let toAdd = 10 + Math.pow(player.troops(), 0.73) / 4;

    // 根据当前部队与最大部队的比例调整增长率
    const ratio = 1 - player.troops() / max;
    toAdd *= ratio;

    if (player.type() === PlayerType.Bot) {
      // 机器人玩家的增长率减少40%
      toAdd *= 0.6;
    }

    if (player.type() === PlayerType.FakeHuman) {
      // 假人类玩家根据难度调整增长率
      switch (this._gameConfig.difficulty) {
        case Difficulty.Easy:
          toAdd *= 0.9;
          break;
        case Difficulty.Medium:
          toAdd *= 1;
          break;
        case Difficulty.Hard:
          toAdd *= 1.1;
          break;
        case Difficulty.Impossible:
          toAdd *= 1.2;
          break;
      }
    }

    return Math.min(player.troops() + toAdd, max) - player.troops();
  }

  // 计算黄金增长率
  goldAdditionRate(player: Player): Gold {
    if (player.type() === PlayerType.Bot) {
      // 机器人玩家每tick获得50金币
      return 50n;
    }
    // 其他玩家每tick获得100金币
    return 100n;
  }

  // 核武器伤害范围配置
  nukeMagnitudes(unitType: UnitType): NukeMagnitude {
    switch (unitType) {
      case UnitType.MIRVWarhead:
        // MIRV弹头：内圈12，外圈18
        return { inner: 12, outer: 18 };
      case UnitType.AtomBomb:
        // 原子弹：内圈12，外圈30
        return { inner: 12, outer: 30 };
      case UnitType.HydrogenBomb:
        // 氢弹：内圈80，外圈100
        return { inner: 80, outer: 100 };
    }
    throw new Error(`Unknown nuke type: ${unitType}`);
  }

  // 核武器攻击导致联盟破裂的阈值
  nukeAllianceBreakThreshold(): number {
    return 100;
  }

  // 默认核武器速度
  defaultNukeSpeed(): number {
    return 6;
  }

  // 默认核武器可攻击范围
  defaultNukeTargetableRange(): number {
    return 150;
  }

  // 默认SAM防空导弹射程
  defaultSamRange(): number {
    return 70;
  }

  // 默认SAM导弹速度
  defaultSamMissileSpeed(): number {
    return 12;
  }

  // 核武器死亡因子计算（人类可以是士兵、攻击中的士兵、船上的士兵等）
  nukeDeathFactor(
    nukeType: NukeType,
    humans: number,
    tilesOwned: number,
    maxTroops: number,
  ): number {
    if (nukeType !== UnitType.MIRVWarhead) {
      // 非MIRV弹头的死亡因子计算
      return (5 * humans) / Math.max(1, tilesOwned);
    }
    // MIRV弹头的复杂死亡因子计算
    const targetTroops = 0.03 * maxTroops;
    const excessTroops = Math.max(0, humans - targetTroops);
    const scalingFactor = 500;

    const steepness = 2;
    const normalizedExcess = excessTroops / maxTroops;
    return scalingFactor * (1 - Math.exp(-steepness * normalizedExcess));
  }

  // 建筑物最小距离
  structureMinDist(): number {
    return 15;
  }

  // 炮弹生存时间
  shellLifetime(): number {
    return 50;
  }

  // 战舰巡逻范围
  warshipPatrolRange(): number {
    return 100;
  }

  // 战舰攻击范围
  warshipTargettingRange(): number {
    return 130;
  }

  // 战舰炮弹攻击频率
  warshipShellAttackRate(): number {
    return 20;
  }

  // 防御哨所炮弹攻击频率
  defensePostShellAttackRate(): number {
    return 100;
  }

  // 免受海盗攻击的最大冷却时间
  safeFromPiratesCooldownMax(): number {
    return 20;
  }

  // 防御哨所攻击范围
  defensePostTargettingRange(): number {
    return 75;
  }

  // 联盟延期提示偏移时间
  allianceExtensionPromptOffset(): number {
    return 300;
  }
}
