# mailCopilot

> 智能邮件处理助手 - Email Item Traceability & Verification System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/mailcopilot)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Cris-z123/11757b000330f5d8d4e482164f08052d/raw/mailcopilot-coverage.json)](https://gist.github.com/Cris-z123/11757b000330f5d8d4e482164f08052d)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-29.4.6-9FEAF5?logo=electron)](https://electronjs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2.4-6E9F18?logo=vitest)](https://vitest.dev/)

## 📖 项目简介

mailCopilot 是一款面向隐私敏感场景的**本地邮件智能处理客户端**，通过规则引擎与本地/远程 LLM 协同，在**用户可控环境**下实现邮件内容结构化、事项提取、**100% 可溯源验证**。

### 核心特性

- ✅ **100% 事项可溯源** - 每个事项均可追溯到原始邮件来源（Message-ID 或 SHA-256 指纹）
- 🔒 **隐私优先架构** - 字段级 AES-256-GCM 加密，设备绑定存储，零知识架构
- 🎯 **智能置信度系统** - 双引擎置信度计算，低置信度事项自动标记
- 🔍 **多格式支持** - 支持主流邮件格式（.eml, .msg, .pst/.ost, .mbox, .html）
- 🌓 **双模式运行** - 本地模式（Ollama）/ 远程模式（OpenAI API）热切换，无需重启
- 💾 **设备绑定存储** - SQLite 本地数据库，WAL 模式，可配置数据保留期
- 📊 **日报生成** - 自动生成包含事项、进度、总结的日报，支持 Markdown/PDF 导出
- 🔄 **本地反馈系统** - 用户可标记事项准确性，反馈数据加密存储，永不联网

## 🚀 快速开始

### 环境要求

- **Node.js**: 20.x (LTS)
- **pnpm**: 8.x
- **操作系统**: Windows 10+, macOS 10.15+

### 本地模式要求（可选）

如果使用本地模式，需要先安装 Ollama
```

### 安装步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 重建原生模块（better-sqlite3）
pnpm run rebuild

# 3. 开发模式运行
pnpm run dev

# 4. 构建生产版本
pnpm run build

# 5. 运行生产版本
pnpm run start
```

## 📦 分发与安装

当前阶段仅支持 Windows 内测分发，不支持自动更新。

- **Windows**：自签名 `.exe` 内测安装器，通过 GitHub Releases 下载。测试机安装前需导入并信任自签测试证书。
- **macOS**：macOS 构建会随 Release 一起上传，但属于实验性产物，未签名、未公证，不作为正式支持分发。

升级方式为重新下载安装包覆盖安装，升级过程不会删除用户数据。

## 🏗️ 技术栈

### 核心框架
- **Electron** 29.4.6 - 跨平台桌面应用框架
- **React** 18 - 用户界面
- **TypeScript** 5.4 - 类型安全
- **Zustand** 4.5 - 状态管理
- **Tailwind CSS** v3.4 - 样式框架
- **shadcn/ui** - UI 组件库

## 🔧 开发指南

### 开发命令

```bash
# 启动开发服务器（热重载）
pnpm run dev

# 类型检查
pnpm run typecheck

# 代码检查
pnpm run lint

# 自动修复代码风格
pnpm run lint:fix

# 格式化代码
pnpm run format
```

### 测试命令

```bash
# 运行所有测试
pnpm test

# 单元测试
pnpm run test:unit

# 集成测试
pnpm run test:integration

# 安全测试
pnpm run test:security

# 代码覆盖率
pnpm run test:coverage
```

## 📖 文档

- [技术架构文档](./docs/tech-architecture.md) - 完整的技术设计说明
- [功能规格](./specs/001-email-item-traceability/spec.md) - 详细功能需求
- [LLM API 文档](./docs/api/llm-api.md) - LLM 适配器接口文档
- [部署指南](./docs/deployment.md) - 打包、签名、发布指南
- [设计系统](./docs/DESIGN_SYSTEM.md) - UI/UX 设计规范

## 🔒 安全与隐私

### 设计原则

1. **隐私优先**: 默认远程模式，完全离线可选
2. **零知识架构**: 不提供云备份，无跨设备同步
3. **防幻觉机制**: 100% 事项可溯源，无来源事项降级入库
4. **设备绑定**: 数据绑定当前设备，重装系统即数据丢失
5. **字段级加密**: 敏感字段 AES-256-GCM 加密
6. **本地反馈**: 用户反馈永不联网传输

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
refactor: refactor code
chore: update dependencies
```

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite 同步驱动
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

## 📮 联系方式
- 问题反馈: [GitHub Issues](https://github.com/your-org/mailcopilot/issues)
