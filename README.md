# Git Switch

本地 Git 配置切换工具 —— Git Identity &amp; Profile Manager for Developers。

> 支持多套身份（工作 / 个人 / 开源）一键切换、项目级差异化配置、按目录自动切换（includeIf）、配置浏览器、备份回滚与导入导出。

![platform](https://img.shields.io/badge/platform-Windows-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能

| 模块 | 说明 |
|---|---|
| **概览 Dashboard** | 当前全局身份、Git 版本、配置集/自动切换/备份统计，环境一览 |
| **配置集** | 多套身份的 CRUD（name/email/signingkey/proxy/任意 key），一键应用到全局或指定仓库；常用项模板；敏感项脱敏 |
| **项目配置** | 打开任意 Git 仓库：查看/编辑 local scope、分支、remote、最近提交；把配置集应用到项目 |
| **生效值** | system → global → local 多层叠加的最终生效值，覆盖链可视化下钻，右键复制 |
| **自动切换** | 目录 → 配置集映射（includeIf），进入目录自动加载身份，冲突检测，一键同步到全局配置 |
| **配置浏览器** | 全部配置项浏览，scope 来源标注，敏感项脱敏可切换明文，配置项悬停显示含义 |
| **备份与回滚** | 每次写操作前自动备份，备份点列表、内容查看、行级 Diff、一键回滚（回滚前保护） |
| **导入导出** | 配置集导出 JSON（脱敏选项）/ 剪贴板，跨机迁移 |
| **系统托盘** | 托盘一键应用配置集，全局身份实时显示；关闭窗口最小化到托盘 |

## 主题与语言

- **主题**：默认**跟随系统**（`设置 → 外观 → 主题`），也可固定深色或浅色；Header 按钮可在 跟随系统 / 深色 / 浅色 间循环。
- **语言**：默认**跟随系统**（系统为中文则中文，否则英文），也可手动固定；Header 按钮在 跟随系统 / 中文 / English 间循环。
- 两者均持久化到 `%APPDATA%` 的 localStorage（`gs-settings`）。

## 设置

`设置` 页面集中管理：

| 分组 | 选项 |
|---|---|
| 外观 | 主题（跟随系统 / 深色 / 浅色）、语言（跟随系统 / 中文 / English） |
| 窗口 | 关闭按钮行为（最小化到系统托盘 / 直接退出） |
| 关于 | 版本信息（Git / Electron / Node / Chromium）+ GitHub |

## 自定义标题栏

窗口为无边框设计，顶部为应用内标题栏：拖拽区域 + 最小化 / 最大化 / 关闭（关闭 = 最小化到托盘，托盘「退出」才真正退出）。

## 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd + 1~7` | 切换页面（概览/配置集/项目配置/生效值/自动切换/配置浏览器/备份与回滚） |
| 鼠标右键（生效值行） | 复制该配置项最终生效值 |

## 首次启动引导

首次启动自动弹出引导：检测 Git 环境 → **预填你当前的全局 git 身份（user.name / user.email）** → 命名配置集（默认为「默认」）→ 可选应用到全局。

## 配置项含义

表格与标签中的配置项 key（如 `user.email`、`http.proxy`）悬停会显示含义说明。

## 技术栈

- **Electron 43** + **electron-vite 5**（主进程 / preload / 渲染层三段式）
- **React 19** + **antd 6** + **lucide-react**（深色玻璃拟态设计系统）
- **TypeScript 7**，共享类型 `src/shared/types.ts` 主进程/preload/渲染层单一来源
- 与 git 交互全部走 `git config` 命令族（无 shell 参数数组，防注入）

## 开发

```powershell
# 安装依赖（首次需下载 Electron 二进制，如网络慢可设 ELECTRON_MIRROR）
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install

# 启动开发模式（热更新）
npm run dev

# 类型检查
npm run typecheck
```

## 构建安装包

```powershell
# 生产构建 + NSIS 安装包（输出到 dist/）
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run build:win
```

## 冒烟测试

`GS_SMOKE=1` 启动时自动跑全链路冒烟测试（在临时目录完成，**不触碰真实用户配置**）：

```powershell
$env:GS_SMOKE='1'; npm run dev
```

覆盖：配置集 CRUD → 应用到仓库 → 备份/回滚 → includeIf 自动切换（经 `GIT_CONFIG_GLOBAL` 隔离）→ 导入导出 → Diff → lastCommit。

## 数据存储

- 应用数据：`%APPDATA%\git-switch\`（`profiles.json` / `backups.json` / `includes.json` / `operations.log` / `onboarding.json`）
- 备份点：`%APPDATA%\git-switch\backup\<timestamp>\`
- 配置集独立文件：`~\.gitconfig-<profileId>`（由 includeIf 引用）

## 安全设计

- 写配置前自动备份；回滚前再保护，全程可逆
- 敏感项（token / proxy / credential）默认脱敏显示与导出
- 外部链接一律系统浏览器打开；渲染层无 Node 权限（contextIsolation）
