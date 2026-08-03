# Git Switch

> 本地 Git 配置切换工具 —— **Git Identity & Profile Manager for Developers**

多套 Git 身份(工作 / 个人 / 开源)一键切换、项目级差异化配置、按目录自动切换(`includeIf`)、配置浏览器、备份回滚与导入导出。Windows 桌面应用。

[![release](https://img.shields.io/github/v/release/Siborne/git-switch?label=Release&color=6366f1)](https://github.com/Siborne/git-switch/releases/latest)
[![build](https://img.shields.io/github/actions/workflow/status/Siborne/git-switch/release-windows.yml?label=Windows%20Build&color=22c55e)](https://github.com/Siborne/git-switch/actions/workflows/release-windows.yml)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/Siborne/git-switch/releases/latest)
[![license](https://img.shields.io/github/license/Siborne/git-switch?color=green)](LICENSE)

---

## 为什么需要它

开发者通常持有多套 Git 身份(工作 / 个人 / 开源),还要在不同仓库使用不同的 `user.name` / `user.email` / 签名密钥 / 代理:

- ❌ 手动编辑 `~/.gitconfig` 与仓库 `.git/config`,容易改错、忘记切换、污染配置
- ❌ `includeIf` 能按目录自动加载配置,但语法手写、路径规则易错,没有可视化手段
- ❌ 改坏配置后没有备份,难以恢复

**Git Switch 用图形界面解决这一切,且所有写操作前自动备份、全程可回滚。**

## 功能一览

| 模块 | 说明 |
|---|---|
| **概览 Dashboard** | 当前全局身份、Git 版本、配置集/自动切换/备份统计,环境一览 |
| **配置集** | 多套身份的 CRUD(name/email/signingkey/proxy/任意 key),一键应用到全局或指定仓库;常用项模板;敏感项脱敏 |
| **项目配置** | 打开任意 Git 仓库:查看/编辑 local scope、分支、remote、最近提交;把配置集应用到项目 |
| **生效值** | system → global → local 多层叠加的最终生效值,覆盖链可视化下钻,右键复制 |
| **自动切换** | 目录 → 配置集映射(`includeIf gitdir:`),进入目录自动加载身份,冲突检测,一键同步到全局配置 |
| **配置浏览器** | 全部配置项浏览,scope 来源标注,敏感项脱敏可切换明文,悬停显示配置项含义 |
| **备份与回滚** | 每次写操作前自动备份,备份点列表、内容查看、行级 Diff、一键回滚(回滚前再保护) |
| **导入导出** | 配置集导出 JSON(脱敏选项)/ 剪贴板,跨机迁移 |
| **系统托盘** | 托盘一键应用配置集,全局身份实时显示;关闭窗口最小化到托盘 |

## 安装

从 [GitHub Releases](https://github.com/Siborne/git-switch/releases/latest) 下载最新版 Windows 安装包(`Git Switch Setup <version>.exe`),双击安装即可。

> 依赖 [Git for Windows](https://git-scm.com/download/win);首次启动会自动检测 `git.exe` 并给出引导。

## 快速开始

1. **启动**应用,首次启动引导自动弹出,检测 Git 环境并**预填你当前的全局身份**
2. **创建配置集**:如「工作」(`work@company.com` + 公司签名密钥)、「个人」、「开源」
3. **应用到全局**:点击「应用到全局」一键切换身份(覆盖同名项 + 保留无关项)
4. **按目录自动切换**(可选):在「自动切换」页把 `D:/work` 映射到「工作」配置集,进入该目录后 `git config user.email` 自动生效
5. 改错了?去「备份与回滚」一键回到任意历史备份点

## 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd + 1~7` | 切换页面(概览/配置集/项目配置/生效值/自动切换/配置浏览器/备份与回滚) |
| 鼠标右键(生效值行) | 复制该配置项最终生效值 |

## 主题 / 语言 / 设置

- **主题**:跟随系统(默认)/ 深色 / 浅色;深色为透明玻璃拟态科技风
- **语言**:跟随系统(默认)/ 中文 / English
- **设置**页面:外观、关闭窗口行为(最小化到托盘 / 直接退出)、关于(版本信息 + GitHub)
- 自定义无边框标题栏:拖拽 + 最小化 / 最大化 / 关闭(关闭 = 最小化到托盘)

## 技术栈

- **Electron 43** + **electron-vite 5**(主进程 / preload / 渲染层三段式,`contextIsolation` 安全基线)
- **React 19** + **antd 6** + **lucide-react**
- **TypeScript**,共享类型 `src/shared/types.ts` 主进程 / preload / 渲染层单一来源
- 与 git 交互全部走 `git config` 命令族(无 shell 参数数组,防注入)

## 开发

```powershell
# 安装依赖(首次需下载 Electron 二进制,网络慢可设镜像)
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install

# 启动开发模式(热更新)
npm run dev

# 类型检查
npm run typecheck
```

## 构建安装包

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run build:win   # 产出 dist/Git Switch Setup <version>.exe
```

## 自动构建与发布

[`release-windows.yml`](.github/workflows/release-windows.yml) 在推送 `v*` 标签时自动在 Windows runner 上构建安装包并发布 GitHub Release(含 `latest.yml` 供自动更新);落地页见 [git-switch 官网](https://siborne.github.io/git-switch)。

## 冒烟测试

`GS_SMOKE=1` 启动时自动跑全链路冒烟测试(在临时目录完成,**不触碰真实用户配置**):

```powershell
$env:GS_SMOKE='1'; npm run dev
```

覆盖:配置集 CRUD → 应用到仓库 → 备份/回滚 → includeIf 自动切换(经 `GIT_CONFIG_GLOBAL` 隔离)→ 导入导出 → Diff → lastCommit。

## 数据存储

- 应用数据:`%APPDATA%\git-switch\`(`profiles.json` / `backups.json` / `includes.json` / `operations.log` / `onboarding.json`)
- 备份点:`%APPDATA%\git-switch\backup\<timestamp>\`
- 配置集独立文件:`~\.gitconfig-<profileId>`(由 `includeIf` 引用,不污染全局配置)

## 安全设计

- 写配置前自动备份;回滚前再保护,全程可逆
- 敏感项(token / proxy / credential)默认脱敏显示与导出
- 外部链接一律系统浏览器打开;渲染层无 Node 权限(`contextIsolation` + `sandbox`)

## License

[MIT License](LICENSE) © 2026 Siborne — 允许商用、闭源衍生、自由修改与分发,仅需保留版权声明与许可文本。
