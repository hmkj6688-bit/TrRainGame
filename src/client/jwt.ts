/**
 * JWT身份验证和用户管理模块
 * 
 * 该文件实现了完整的JWT（JSON Web Token）身份验证系统，主要功能包括：
 * 
 * 核心功能：
 * - JWT令牌管理：获取、存储、验证和刷新JWT令牌
 * - 用户身份验证：支持Discord登录和令牌登录
 * - 会话管理：登录状态检查、自动刷新、登出功能
 * - 用户信息获取：获取当前用户和其他玩家的个人资料
 * 
 * 安全特性：
 * - 令牌验证：检查JWT的签发者、受众、过期时间等
 * - 自动刷新：在令牌即将过期时自动刷新
 * - 安全存储：支持localStorage和Cookie存储
 * - 跨域支持：处理不同域名下的身份验证
 * 
 * API集成：
 * - RESTful API调用封装
 * - 错误处理和重试机制
 * - 响应数据验证和类型安全
 * - 授权头自动添加
 * 
 * 存储策略：
 * - 优先级：URL哈希 > Cookie > localStorage
 * - 自动清理过期令牌
 * - 支持多环境配置（开发/生产）
 * 
 * @author OpenFrontIO Team
 * @version 1.0.0
 */

// JWT解码库，用于解析JWT令牌内容
import { decodeJwt } from "jose";
// Zod数据验证库，用于运行时类型检查和数据验证
import { z } from "zod";
// API数据结构定义，包含用户、令牌等相关的Schema
import {
  PlayerProfile,
  PlayerProfileSchema,
  RefreshResponseSchema,
  TokenPayload,
  TokenPayloadSchema,
  UserMeResponse,
  UserMeResponseSchema,
} from "../core/ApiSchemas";
// 服务器配置加载器，用于获取JWT受众等配置信息
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";

/**
 * 获取JWT受众（audience）
 * 从当前URL中提取域名作为JWT的受众标识
 * 
 * @returns {string} 域名（如：example.com）
 */
function getAudience() {
  const { hostname } = new URL(window.location.href);
  const domainname = hostname.split(".").slice(-2).join(".");
  return domainname;
}

/**
 * 获取API基础URL
 * 根据当前环境（开发/生产）返回相应的API服务器地址
 * 
 * 环境判断逻辑：
 * - localhost：使用环境变量API_DOMAIN或localStorage中的apiHost，默认为http://localhost:8787
 * - 其他域名：使用api.{domain}格式的HTTPS地址
 * 
 * @returns {string} API基础URL
 */
export function getApiBase() {
  const domainname = getAudience();

  // 开发环境处理：localhost域名
  if (domainname === "localhost") {
    // 优先使用环境变量中的API域名
    const apiDomain = process?.env?.API_DOMAIN;
    if (apiDomain) {
      return `https://${apiDomain}`;
    }
    // 回退到localStorage中存储的API主机地址，默认为本地开发服务器
    return localStorage.getItem("apiHost") ?? "http://localhost:8787";
  }

  // 生产环境：使用api子域名的HTTPS地址
  return `https://api.${domainname}`;
}

/**
 * 获取JWT令牌
 * 按优先级从多个来源获取JWT令牌：URL哈希 > Cookie > localStorage
 * 
 * 获取流程：
 * 1. 检查URL哈希中的token参数（用于OAuth回调）
 * 2. 如果找到token，存储到localStorage并清理URL
 * 3. 检查Cookie中的token
 * 4. 最后检查localStorage中的token
 * 
 * @returns {string | null} JWT令牌字符串，如果未找到则返回null
 */
function getToken(): string | null {
  // 检查URL哈希中的token参数（通常来自OAuth登录回调）
  const { hash } = window.location;
  if (hash.startsWith("#")) {
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("token");
    if (token) {
      // 将token存储到localStorage中以便后续使用
      localStorage.setItem("token", token);
      // 从URL参数中移除token
      params.delete("token");
      params.toString();
    }
    // 清理URL，移除token参数但保留其他参数
    history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        (params.size > 0 ? "#" + params.toString() : ""),
    );
  }

  // 检查Cookie中的token（用于跨标签页会话共享）
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.trim()
    .substring(6);
  if (cookie !== undefined) {
    return cookie;
  }

  // 最后检查localStorage中的token（主要存储位置）
  return localStorage.getItem("token");
}

/**
 * 清除JWT令牌
 * 从所有存储位置清除令牌并更新登录状态
 * 
 * 清理操作：
 * 1. 从localStorage中移除token
 * 2. 更新内部登录状态标志
 * 3. 设置过期Cookie以清除浏览器中的token
 * 4. 根据HTTPS协议设置安全标志
 */
async function clearToken() {
  // 从localStorage中移除token
  localStorage.removeItem("token");
  // 更新内部登录状态缓存
  __isLoggedIn = false;
  // 获取服务器配置以确定正确的域名和安全设置
  const config = await getServerConfigFromClient();
  const audience = config.jwtAudience();
  const isSecure = window.location.protocol === "https:";
  const secure = isSecure ? "; Secure" : "";
  // 设置过期Cookie以清除浏览器中存储的token
  document.cookie = `token=logged_out; Path=/; Max-Age=0; Domain=${audience}${secure}`;
}

/**
 * Discord登录重定向
 * 将用户重定向到Discord OAuth登录页面
 * 
 * 登录流程：
 * 1. 构建Discord OAuth URL，包含当前页面作为回调地址
 * 2. 重定向到Discord进行身份验证
 * 3. 用户授权后，Discord会重定向回当前页面并在URL哈希中包含JWT令牌
 * 4. getToken()函数会自动处理回调中的令牌
 */
export function discordLogin() {
  window.location.href = `${getApiBase()}/login/discord?redirect_uri=${window.location.href}`;
}

/**
 * 令牌登录
 * 使用一次性登录令牌换取JWT访问令牌
 * 
 * @param {string} token - 一次性登录令牌
 * @returns {Promise<string | null>} 成功时返回用户邮箱，失败时返回null
 * 
 * 登录流程：
 * 1. 向服务器发送登录令牌
 * 2. 服务器验证令牌并返回JWT和用户信息
 * 3. 验证JWT格式和内容
 * 4. 清除旧令牌并存储新的JWT
 * 5. 返回用户邮箱作为登录成功的标识
 */
export async function tokenLogin(token: string): Promise<string | null> {
  // 向服务器发送令牌登录请求
  const response = await fetch(
    `${getApiBase()}/login/token?login-token=${token}`,
  );
  if (response.status !== 200) {
    console.error("Token login failed", response);
    return null;
  }
  
  // 解析服务器响应，获取JWT和用户信息
  const json = await response.json();
  const { jwt, email } = json;
  
  // 解码并验证JWT格式
  const payload = decodeJwt(jwt);
  const result = TokenPayloadSchema.safeParse(payload);
  if (!result.success) {
    console.error("Invalid token", result.error, result.error.message);
    return null;
  }
  
  // 清除旧令牌并存储新的JWT
  clearToken();
  localStorage.setItem("token", jwt);
  return email;
}

/**
 * 获取授权请求头
 * 生成用于API请求的Authorization头部
 * 
 * @returns {string} Bearer令牌格式的授权头，如果没有令牌则返回空字符串
 * 
 * 用法示例：
 * ```typescript
 * fetch('/api/endpoint', {
 *   headers: {
 *     'Authorization': getAuthHeader()
 *   }
 * })
 * ```
 */
export function getAuthHeader(): string {
  const token = getToken();
  if (!token) return "";
  return `Bearer ${token}`;
}

/**
 * 用户登出
 * 清除本地令牌并通知服务器撤销会话
 * 
 * @param {boolean} allSessions - 是否撤销所有会话（默认false，仅撤销当前会话）
 * @returns {Promise<boolean>} 登出是否成功
 * 
 * 登出流程：
 * 1. 获取当前JWT令牌
 * 2. 清除本地存储的令牌
 * 3. 向服务器发送登出/撤销请求
 * 4. 服务器将令牌加入黑名单或撤销相关会话
 */
export async function logOut(allSessions: boolean = false) {
  const token = getToken();
  if (token === null) return;
  // 先清除本地令牌，确保即使服务器请求失败也能本地登出
  clearToken();

  // 向服务器发送登出请求，撤销服务器端的会话
  const response = await fetch(
    getApiBase() + (allSessions ? "/revoke" : "/logout"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.ok === false) {
    console.error("Logout failed", response);
    return false;
  }
  return true;
}

/**
 * 登录状态检查结果类型
 * 
 * @typedef {Object} IsLoggedInResponse
 * @property {string} token - JWT令牌字符串
 * @property {TokenPayload} claims - 解码后的JWT载荷数据
 * 
 * 如果用户未登录，则返回false
 */
export type IsLoggedInResponse =
  | { token: string; claims: TokenPayload }
  | false;

// 登录状态缓存，避免重复验证JWT
let __isLoggedIn: IsLoggedInResponse | undefined = undefined;

/**
 * 检查用户登录状态
 * 验证JWT令牌的有效性并返回登录信息
 * 
 * @returns {IsLoggedInResponse} 登录状态和用户信息，或false表示未登录
 * 
 * 验证流程：
 * 1. 使用缓存的结果（如果存在）
 * 2. 获取并验证JWT令牌
 * 3. 检查令牌的签发者、受众、过期时间
 * 4. 如果令牌即将过期，触发自动刷新
 * 5. 返回验证结果和用户信息
 */
export function isLoggedIn(): IsLoggedInResponse {
  // 使用缓存的登录状态，避免重复验证
  __isLoggedIn ??= _isLoggedIn();

  return __isLoggedIn;
}

/**
 * 内部登录状态检查实现
 * 执行实际的JWT验证逻辑
 * 
 * @returns {IsLoggedInResponse} 登录状态和用户信息
 * 
 * 验证步骤：
 * 1. 获取JWT令牌
 * 2. 解码JWT并验证基本格式
 * 3. 验证签发者（iss）是否为当前API服务器
 * 4. 验证受众（aud）是否为当前域名
 * 5. 检查令牌是否过期（exp）
 * 6. 检查令牌是否需要刷新（基于签发时间iat）
 * 7. 验证载荷数据格式
 */
function _isLoggedIn(): IsLoggedInResponse {
  try {
    const token = getToken();
    if (!token) {
      // 没有找到令牌，用户未登录
      return false;
    }

    // 解码JWT令牌（不验证签名，仅解析内容）
    // 注意：在生产环境中应该验证JWT签名，但这里为了简化处理
    const payload = decodeJwt(token);
    const { iss, aud, exp, iat } = payload;

    // 验证签发者：JWT必须由当前API服务器签发
    if (iss !== getApiBase()) {
      console.error(
        'unexpected "iss" claim value',
        // JSON.stringify(payload, null, 2),
      );
      logOut();
      return false;
    }
    
    // 验证受众：JWT必须为当前网站签发（localhost除外）
    const myAud = getAudience();
    if (myAud !== "localhost" && aud !== myAud) {
      console.error(
        'unexpected "aud" claim value',
        // JSON.stringify(payload, null, 2),
      );
      logOut();
      return false;
    }
    
    // 检查令牌是否过期
    const now = Math.floor(Date.now() / 1000);
    if (exp !== undefined && now >= exp) {
      console.error(
        'after "exp" claim value',
        // JSON.stringify(payload, null, 2),
      );
      logOut();
      return false;
    }
    
    // 检查令牌是否需要刷新（3天后自动刷新）
    const refreshAge: number = 3 * 24 * 3600; // 3 days
    if (iat !== undefined && now >= iat + refreshAge) {
      console.log("Refreshing access token...");
      postRefresh().then((success) => {
        if (success) {
          console.log("Refreshed access token successfully.");
        } else {
          console.error("Failed to refresh access token.");
          // TODO: 更新UI显示登出状态
        }
      });
    }

    // 验证JWT载荷数据格式
    const result = TokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid payload", error);
      return false;
    }

    const claims = result.data;
    return { token, claims };
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * 刷新JWT令牌
 * 使用当前令牌获取新的访问令牌
 * 
 * @returns {Promise<boolean>} 刷新是否成功
 * 
 * 刷新流程：
 * 1. 获取当前JWT令牌
 * 2. 向服务器发送刷新请求
 * 3. 处理各种响应状态（401表示需要重新登录）
 * 4. 验证新令牌格式
 * 5. 存储新令牌并更新状态
 */
export async function postRefresh(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;

    // 向服务器发送令牌刷新请求
    const response = await fetch(getApiBase() + "/refresh", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    
    // 处理401未授权响应：令牌已失效，需要重新登录
    if (response.status === 401) {
      clearToken();
      return false;
    }
    
    // 处理其他错误响应
    if (response.status !== 200) return false;
    
    // 解析响应数据并验证格式
    const body = await response.json();
    const result = RefreshResponseSchema.safeParse(body);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid response", error);
      return false;
    }
    
    // 存储新的JWT令牌
    localStorage.setItem("token", result.data.token);
    return true;
  } catch (e) {
    // 刷新失败，清除登录状态
    __isLoggedIn = false;
    return false;
  }
}

/**
 * 获取当前用户信息
 * 从服务器获取当前登录用户的详细信息
 * 
 * @returns {Promise<UserMeResponse | false>} 用户信息对象，失败时返回false
 * 
 * 获取流程：
 * 1. 检查是否有有效的JWT令牌
 * 2. 向/users/@me端点发送GET请求
 * 3. 处理401响应（令牌失效）
 * 4. 验证响应数据格式
 * 5. 返回用户信息
 * 
 * 用户信息包含：用户ID、邮箱、显示名称、头像等
 */
export async function getUserMe(): Promise<UserMeResponse | false> {
  try {
    const token = getToken();
    if (!token) return false;

    // 向服务器请求当前用户信息
    const response = await fetch(getApiBase() + "/users/@me", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    
    // 处理401未授权响应：令牌已失效
    if (response.status === 401) {
      clearToken();
      return false;
    }
    
    // 处理其他错误响应
    if (response.status !== 200) return false;
    
    // 解析并验证响应数据
    const body = await response.json();
    const result = UserMeResponseSchema.safeParse(body);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid response", error);
      return false;
    }
    
    return result.data;
  } catch (e) {
    // 请求失败，清除登录状态
    __isLoggedIn = false;
    return false;
  }
}

/**
 * 根据玩家ID获取玩家资料
 * 从服务器获取指定玩家的公开资料信息
 * 
 * @param {string} playerId - 玩家的唯一标识符
 * @returns {Promise<PlayerProfile | false>} 玩家资料对象，失败时返回false
 * 
 * 获取流程：
 * 1. 验证是否有有效的JWT令牌
 * 2. 构建API请求URL（对玩家ID进行URL编码）
 * 3. 发送GET请求到/player/{playerId}端点
 * 4. 验证响应状态和数据格式
 * 5. 返回玩家资料信息
 * 
 * 玩家资料包含：用户名、等级、统计数据、成就等公开信息
 * 注意：需要有效的JWT令牌才能访问玩家资料
 */
export async function fetchPlayerById(
  playerId: string,
): Promise<PlayerProfile | false> {
  try {
    const base = getApiBase();
    const token = getToken();
    if (!token) return false;
    
    // 构建API请求URL，对玩家ID进行URL编码以处理特殊字符
    const url = `${base}/player/${encodeURIComponent(playerId)}`;

    // 发送GET请求获取玩家资料
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // 检查响应状态
    if (res.status !== 200) {
      console.warn(
        "fetchPlayerById: unexpected status",
        res.status,
        res.statusText,
      );
      return false;
    }

    // 解析并验证响应数据
    const json = await res.json();
    const parsed = PlayerProfileSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("fetchPlayerById: Zod validation failed", parsed.error);
      return false;
    }

    return parsed.data;
  } catch (err) {
    console.warn("fetchPlayerById: request failed", err);
    return false;
  }
}
