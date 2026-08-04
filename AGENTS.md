# AGENTS.md — Git Switch

Windows 桌面工具:本地 Git 配置切换(多身份配置集 / includeIf 自动切换 / 配置浏览器 / 备份回滚 / SSH 密钥管理)。Electron + React + TypeScript。

## Project

- 技术栈:Electron 43 · electron-vite 5 · React 19 · antd 6 · lucide-react · TypeScript(strict)
- 入口:`src/main/index.ts`(主进程);`src/preload/index.ts`(contextBridge 暴露 `window.gitSwitch`);渲染层 `src/renderer/src/`
- 共享类型唯一来源:`src/shared/types.ts`(主进程 / preload / 渲染层三端共用,禁止在别处重复定义领域类型)
- 文档目录:`dev-docs/`(prd / tech / bugs / changelog,与 AI 协作的开发文档,不部署);`docs/` 是 GitHub Pages 落地页(公开部署)

## Commands

```powershell
npm run dev          # 开发模式(热更新)
npm run typecheck    # 类型检查(node + web 两个 tsconfig)
npm run build        # 生产构建到 out/
npm run build:win    # NSIS 安装包到 dist/(网络慢可设 ELECTRON_BUILDER_BINARIES_MIRROR)
$env:GS_SMOKE='1'; npm run dev   # 冒烟测试全链路(临时目录,不碰真实用户配置)
```

## Architecture

- `src/main/git.ts` — git 命令封装(execFile 无 shell 参数数组,防注入);`GitError` 携带退出码/stderr
- `src/main/{backup,profiles,includeIf,ssh}.ts` — 领域服务:备份回滚 / 配置集 / includeIf 同步 / SSH 密钥
- `src/main/storage.ts` — 数据目录 + JSON 原子读写;`logger.ts` — 操作日志;`onboarding.ts` — 引导状态;`appConfig.ts` — 全局 gitconfig 路径与测试隔离环境变量
- `src/main/ipc/<domain>.ts` — 按域注册 IPC handler,统一经 `safeHandle`(捕获异常+日志),聚合入口 `ipc/index.ts`
- `src/main/smoke.ts` — 冒烟测试(`GS_SMOKE=1` 触发)
- `src/renderer/src/pages/` — 每功能一页;`lib/i18n.ts` 的 `t(中, 英)` 双语;`lib/keyDocs.ts` 配置项含义
- `src/renderer/src/App.tsx` — 菜单注册(`menuKeys` + `pages` + `pageLabels` 三处都要加)

## Conventions

- **测试隔离**:主进程可触碰真实用户配置的路径一律支持 `GS_TEST_*` 环境变量重定向(`GS_TEST_GLOBAL_CONFIG` / `GS_TEST_PROFILE_DIR` / `GS_TEST_SSH_DIR`),冒烟测试据此隔离
- **安全**:用户输入(key/host/fileName/路径)必须白名单校验;写配置前备份(backup),回滚前再保护;敏感项(proxy/token/credential)脱敏
- **类型**:领域类型统一放 `shared/types.ts`;IPC 参数/返回值即共享类型,不重复声明
- **提交**:本机 `commit.gpgsign=true` 但无 GPG 密钥 → 提交一律 `git commit --no-gpg-sign`
- **提交信息**:中文,`type(scope): 描述`(feat/fix/refactor/docs/style/ci)
- **新需求流程**:先 `dev-docs/prd/` 写 PRD → 用户评审通过 → 开发(PRD 已评审通过的约定)
- 渲染层 hooks 不得条件调用(early return 必须放在所有 hooks 之后)

## Release(发版流程)

1. `package.json` bump 版本(大功能 bump minor,如 0.1.0 → 0.2.0)
2. 同步硬编码版本:`src/renderer/src/pages/Settings.tsx`、`docs/index.html`(hero 版本号)
3. 更新 `dev-docs/changelog/` 修改日志
4. 提交推送 master
5. 打标签触发 CI 自动构建 + 发布:
   ```powershell
   git tag v0.2.0
   git push origin v0.2.0
   ```
6. 监控 `.github/workflows/release-windows.yml`(run 在 GitHub Actions)完成,检查 Release 资产(exe / blockmap / latest.yml)
7. 若 CI 构建时用 tag 版本覆盖 package.json 版本,务必保证 tag 与 package.json 一致

## Notes

- (待补充)
