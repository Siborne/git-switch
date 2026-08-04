# CHANGELOG 0.2.0

> 日期:2026-08-04
> 自 v0.1.0 起的主要变更(正式发布)

## ✨ 新功能

- **SSH 密钥管理页面**(第 8 个菜单项,`Ctrl+1~8`):
  - 一键生成 ed25519 / RSA 4096 密钥对,自动落盘 `~/.ssh/`,防覆盖保护
  - 展示 / 复制公钥,引导添加到 GitHub / GitLab
  - 可选写 `~/.ssh/config`(Host 块幂等更新、写前预览、可删除撤销)
  - 修改已有密钥备注(改前自动备份原私钥)
  - 未安装 OpenSSH 时给出启用指引
- 配置集模板新增 `core.sshCommand`;配置项含义补充 SSH 相关条目

## 🔧 重构

- 主进程架构重构(行为不变):
  - 领域类型统一到 `shared/types.ts` 单一来源,消除模块重复定义
  - `store.ts` 按职责拆分为 `storage.ts` / `logger.ts` / `onboarding.ts`
  - 新增 `appConfig.ts` 统一路径与测试隔离环境变量
  - `ipc.ts` 按域拆分为 `src/main/ipc/` 各注册模块 + 聚合入口
  - 统一 IPC 错误处理(`safeHandle` + preload 泛型 `invoke` 错误解包)

## 🐛 修复

- SSH 页面旧构建防护:preload 未加载 ssh API 时提示重启而非报错
- 修复 `ssh-keygen` 探测(`-h` 非 0 退出码导致误判不可用)

## 📄 文档与 CI

- 新增项目级 `AGENTS.md`(项目内容 / 架构 / 约定 / 发版流程)
- README 重写为仓库门面(动态徽章 / 功能一览 / 快速开始)
- 新增 GitHub Pages 落地页(`docs/`)与部署 workflow
- 新增 `dev-docs/` 开发文档目录(prd / tech / bugs / changelog)
- 新增 Windows 构建与 GitHub Release 发布 workflow(`release-windows.yml`)
- 冒烟测试新增 SSH 密钥链路(生成 / 防覆盖 / config 幂等 / 改备注)
