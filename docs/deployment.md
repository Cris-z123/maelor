# Deployment Guide: Maelor

## 1. Lifecycle Policy

Maelor 当前采用以下发布与使用策略：
- Windows：唯一受支持的内测分发平台，自签名证书签名
- macOS：实验性构建，仅用于开发验证，未签名、未公证
- 自动更新：当前未实现受支持的自动更新链路
- 升级方式：用户通过 GitHub Releases 重新下载安装包完成升级

## 2. Release Artifacts

Windows 内测产物：
- `Maelor-<version>-windows-x64.exe`
- 必须完成 Windows 代码签名后才允许上传到 GitHub Release
- 当前阶段允许使用自签测试证书，但仅用于受控内测，不代表正式受信任发布

macOS 实验性产物：
- `Maelor-<version>-macos-arm64.dmg` 或 `zip`
- 可能被 Gatekeeper 阻止，不作为正式支持分发

## 3. Windows Build Requirements

CI 或本地内测打包前必须配置：

```bash
WIN_CSC_LINK=/path/to/certificate.pfx
WIN_CSC_KEY_PASSWORD=your-password
GH_TOKEN=your-github-token
```

如果缺少 `WIN_CSC_LINK` 或 `WIN_CSC_KEY_PASSWORD`，Windows 内测 Release 必须失败，不能上传未签名安装包。

测试机安装前要求：
- 先导入签发该安装包的自签测试证书
- 将证书加入受信任根证书颁发机构或受信任发布者，按内测环境策略执行
- 未信任证书前，Windows 会持续提示安装器和应用不受信任

本地打包命令：

```bash
pnpm install --frozen-lockfile
pnpm run rebuild
pnpm run build
pnpm run dist:win
```

## 4. Install, Upgrade, and Uninstall

安装：
- 用户从 GitHub Releases 下载 Windows 自签名内测安装包
- 首次安装前先在测试机导入并信任对应测试证书
- 运行安装器并完成目录选择

升级：
- 通过下载安装新版本安装包覆盖安装
- 升级不会删除用户数据
- 启动时如果检测到数据库 schema 需要升级，会先创建数据库备份，再执行顺序迁移
- 如果迁移失败、缺少迁移路径、或数据库版本高于当前应用支持范围，应用会阻止启动并展示恢复指引

卸载：
- 卸载器会先结束运行中的 `Maelor.exe` 进程树
- 真正卸载时会删除应用文件和用户数据目录
- 升级过程中的卸载阶段不会删除用户数据

## 5. Startup Failure Policy

启动失败时必须满足：
- 记录错误日志
- 关闭 SQLite 连接
- 释放单实例锁
- 向用户显示可读错误对话框
- 以非零退出码立即退出进程

这条策略的目的是避免无窗口后台进程残留，并防止卸载或再次启动时出现锁文件和数据库占用问题。

## 6. Release Workflow Expectations

GitHub Actions 发布流程必须做到：
- 使用 `package.json` 版本与 `v<version>` 标签一致性校验
- Windows 构建前检查签名密钥是否存在
- Windows 产物作为内测下载渠道上传
- Release Notes 明确声明“Windows 自签内测、macOS 实验”
- macOS 产物仅作为实验性附件上传

## 7. Supported Recovery Guidance

数据库迁移失败：
- 不要手动删除数据库文件
- 优先保留自动生成的数据库备份
- 记录错误信息并联系维护人员

配置密钥不可用：
- 确认当前 Windows 用户与原始安装环境一致
- 检查系统安全存储是否可用
- 必要时重新配置应用

## 8. Verification Checklist

发布前至少验证：
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:unit`
- Windows 打包成功且使用签名凭据
- 测试机已信任自签测试证书
- 启动失败场景下无后台残留进程
- 旧 schema 数据库可迁移，失败时保留备份
- 卸载会清理用户数据，升级不会删数据
