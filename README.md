

[EEOO.IO](https://eeoo.io/) 是一款专注于领土控制和联盟建设的在线实时策略游戏。玩家在基于真实世界地理的各种地图上竞争扩张领土、建造建筑物并形成战略联盟。

这是 openfront.io 的分支/修改版本整理代码并添加详细的中文注释，更利于中文开发者快速上手项目。感谢 https://github.com/openfrontio/OpenFrontIO。


[![Crowdin](https://badges.crowdin.net/openfront-mls/localized.svg)](https://crowdin.com/project/openfront-mls)
[![CLA assistant](https://cla-assistant.io/readme/badge/openfrontio/OpenFrontIO)](https://cla-assistant.io/openfrontio/OpenFrontIO)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Assets: CC BY-SA 4.0](https://img.shields.io/badge/Assets-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

## 🌟 功能特性

- **实时策略游戏**: 扩张你的领土并参与战略战斗
- **联盟系统**: 与其他玩家结成联盟进行相互防御
- **多种地图**: 在包括欧洲、亚洲、非洲等各种地理区域进行游戏
- **资源管理**: 平衡你的扩张与防御能力
- **跨平台**: 在任何现代网络浏览器中游戏

## 📋 前置要求

- [npm](https://www.npmjs.com/) (v10.9.2 或更高版本)
- 现代网络浏览器 (Chrome、Firefox、Edge 等)

## 🚀 安装

1. **克隆仓库**

   ```bash
   git clone https://github.com/hmkj6688-bit/TrRainGame.git
   cd TrRainGame
   ```

2. **安装依赖**

   ```bash
   npm i
   ```

## 🎮 运行游戏

### 开发模式

同时运行客户端和服务器的开发模式，支持实时重载：

```bash
npm run dev
```

这将会：

- 启动客户端的 webpack 开发服务器
- 启动带有开发设置的游戏服务器
- 在默认浏览器中打开游戏

### 仅客户端

仅运行支持热重载的客户端：

```bash
npm run start:client
```

### 仅服务器

仅运行带有开发设置的服务器：

```bash
npm run start:server-dev
```

### 连接到预发布或生产后端

有时连接到生产服务器对于重播游戏、测试用户配置文件、购买或登录流程很有用。

连接到预发布 API 服务器：

```bash
npm run dev:staging
```

连接到生产 API 服务器：

```bash
npm run dev:prod
```

## 🛠️ 开发工具

- **格式化代码**:

  ```bash
  npm run format
  ```

- **代码检查**:

  ```bash
  npm run lint
  ```

- **代码检查并修复**:

  ```bash
  npm run lint:fix
  ```

- **测试**
  ```bash
  npm test
  ```

## 🏗️ 项目结构

- `/src/client` - 前端游戏客户端
- `/src/core` - 共享游戏逻辑
- `/src/server` - 后端游戏服务器
- `/resources` - 静态资源 (图片、地图等)

## 📝 许可证

本项目根据 [LICENSE](LICENSE) 文件中的条款进行许可。


