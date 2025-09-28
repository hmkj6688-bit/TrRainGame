<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="resources/images/OpenFrontLogoDark.svg">
    <source media="(prefers-color-scheme: light)" srcset="resources/images/OpenFrontLogo.svg">
    <img src="resources/images/OpenFrontLogo.svg" alt="OpenFrontIO Logo" width="300">
  </picture>
</p>

[OpenFront.io](https://openfront.io/) 是一款专注于领土控制和联盟建设的在线实时策略游戏。玩家在基于真实世界地理的各种地图上竞争扩张领土、建造建筑物并形成战略联盟。

这是 WarFront.io 的分支/重写版本。感谢 https://github.com/WarFrontIO。

![CI](https://github.com/openfrontio/OpenFrontIO/actions/workflows/ci.yml/badge.svg)
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
   git clone https://github.com/openfrontio/OpenFrontIO.git
   cd OpenFrontIO
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

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. 请求加入开发 [Discord](https://discord.gg/K9zernJB5z)。
1. Fork 仓库
1. 创建你的功能分支 (`git checkout -b amazing-feature`)
1. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
1. 推送到分支 (`git push origin amazing-feature`)
1. 打开一个 Pull Request

## 🌐 翻译

欢迎翻译者！请随时帮助翻译成你的语言。
如何帮助？

1. 请求加入开发 [Discord](https://discord.gg/K9zernJB5z) (在申请表中，说明你想帮助翻译)
1. 前往项目的 Crowdin 翻译页面：[https://crowdin.com/project/openfront-mls](https://crowdin.com/project/openfront-mls)
1. 如果你已有账户请登录 / 如果没有账户请注册
1. 选择你想要翻译的语言 / 如果你的语言不在列表中，点击"请求新语言"按钮并输入你想要添加的语言。
1. 翻译字符串

### 项目治理

- 项目维护者 ([evan](https://github.com/evanpelle)) 对所有代码更改和设计决策拥有最终权威
- 所有 pull request 在合并前都需要维护者批准
- 维护者保留拒绝与项目愿景或质量标准不符的贡献的权利

### 新贡献者的贡献路径

为确保代码质量和项目稳定性，我们使用渐进式贡献系统：

1. **新贡献者**: 仅限于 UI 改进和小错误修复

   - 这有助于你熟悉代码库
   - UI 更改更容易审查，不太可能破坏核心功能
   - 小而专注的 PR 有更高的被接受机会

2. **资深贡献者**: 在几个成功的 PR 后并展示对代码库的理解后，你可以处理更复杂的功能

3. **核心贡献者**: 只有对项目有丰富经验的人才能修改关键游戏系统

### 如何成功贡献

1. **开始工作前**:

   - 打开一个 issue 描述你想要贡献的内容
   - 在投入大量时间前等待维护者反馈
   - 小改进可以直接进入 PR 阶段

2. **代码质量要求**:

   - 所有代码必须有良好的注释并遵循现有的样式模式
   - 新功能不应破坏现有功能
   - 代码应在提交前经过彻底测试
   - src/core 中的所有代码更改 _必须_ 经过测试。

3. **Pull Request 流程**:

   - 保持 PR 专注于单一功能或错误修复
   - 为 UI 更改包含截图
   - 描述你执行的测试
   - 对反馈和请求的更改保持响应

4. **测试要求**:
   - 验证你的更改按预期工作
   - 如果适用，在多个系统/浏览器上测试
   - 在 PR 中记录你的测试过程

### 沟通

- 在所有项目交互中保持尊重和建设性
- 欢迎提问，但请先搜索现有 issue
- 对于重大更改，在开始工作前在 issue 中讨论

### 最后说明

请记住，维护这个项目需要大量努力。维护者感谢你的贡献，但必须优先考虑项目的长期健康和稳定性。不是所有贡献都会被接受，这是正常的。

感谢你帮助让 OpenFront 变得更好！
