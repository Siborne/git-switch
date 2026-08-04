# PRD：SSH 密钥管理

> 状态:v1.0(草案,待评审)
> 日期:2026-08-03

## 1. 背景与问题

开发者通过 SSH 协议(`git@github.com:user/repo.git`)克隆/推送仓库时,需要本地具备对应的 SSH 密钥对(私钥 + 公钥):

- 现状:Git Switch 只把 `user.signingkey` 当作普通 GPG 指纹配置项,没有任何 SSH 密钥能力。
- 痛点:配置 SSH 链接时无法在软件里设置/生成对应密钥;新手不知道如何生成密钥对、落盘到哪、如何把公钥添加到 GitHub/GitLab。

## 2. 目标

在 Git Switch 中新增 **SSH 密钥** 独立页面,实现:

1. **一键生成密钥对**(ed25519 默认,可切 RSA 4096),自动落盘 `~/.ssh/`。
2. **展示公钥**,一键复制,引导用户添加到 GitHub/GitLab。
3. **可选写入 `~/.ssh/config`**(勾选 host,如 `github.com`),之后 SSH clone/push 自动使用该密钥。
4. **防覆盖保护**:目标文件已存在时提示,绝不覆盖已有密钥。

## 3. 功能需求

### 3.1 SSH 密钥页面(新菜单项「SSH 密钥」,位于侧边栏)

**密钥状态区**:
- 检测 `~/.ssh/id_ed25519` / `id_rsa` 是否已存在;
- 已有:显示密钥类型、公钥指纹,展示公钥内容(只读,含复制按钮);
- 无:空态引导"生成密钥对"。

**生成表单**:
- 密钥类型:`ed25519`(默认)/ `RSA 4096`;
- 注释(comment,可选,默认 `user@host`,用于公钥尾部标识);
- 目标文件名:默认 `id_ed25519` / `id_rsa`(与类型联动),可自定义;
- 生成按钮 → 确认后执行(再次确认是否覆盖的场景见 3.3)。

**生成结果区**:
- 展示公钥全文(等宽字体,只读),一键复制;
- 展示私钥/公钥落盘路径;
- 操作提示:如何把公钥添加到 GitHub(Settings → SSH keys)、GitLab(Preferences → SSH Keys);
- 「配置到 ssh config」折叠面板(见 3.2)。

### 3.2 可选写 `~/.ssh/config`

- 表单:Host(默认 `github.com`,可改)、User(默认 `git`)、IdentityFile(默认刚生成的私钥路径);
- 写入 `~/.ssh/config`(不存在则创建),幂等:
  - 已存在同 Host 块 → 更新/补充 `IdentityFile` 行,保留该块其余行与注释;
  - 不存在 → 追加新 Host 块;
- 写入内容:
  ```
  Host github.com
      HostName github.com
      User git
      IdentityFile ~/.ssh/id_ed25519
      IdentitiesOnly yes
  ```
- 写入前展示预览,用户确认后落盘;写入后可一键撤销(删除/还原该 Host 块)。

### 3.3 防覆盖保护

- 生成前检测目标私钥文件(`.pub` 同理)是否已存在:
  - 已存在 → 阻止生成,提示"已存在密钥,使用现有密钥或改名",提供「查看现有公钥」入口;
- 私钥内容永不展示、永不复制(仅公钥)。

### 3.4 周边增强

- `keyDocs.ts` 补充:`core.sshCommand`(如 `ssh -i ~/.ssh/id_ed25519`)、`gpg.format = ssh`(SSH 提交签名)说明;
- 配置集模板补充:`core.sshCommand` 可选模板项;
- 页面提供「测试连接」按钮(可选,MVP 不做,见 §7 边界)。

## 4. 非功能需求

| 项 | 要求 |
|---|---|
| 平台 | Windows 10/11;依赖 Windows 自带 OpenSSH(`ssh-keygen` 位于 `System32\OpenSSH`);缺失时给出启用指引(设置 → 应用 → 可选功能 → OpenSSH 客户端) |
| 安全性 | 私钥仅落盘且权限由 ssh-keygen 设置(不手动 chmod);UI 只展示公钥;写 ssh config 前预览;不覆盖已有文件 |
| 可测试性 | 新增 `GS_TEST_SSH_DIR` 环境变量重定向 `~/.ssh`(与 `GS_TEST_GLOBAL_CONFIG` 同模式),冒烟测试全链路隔离 |
| 可靠性 | 所有 ssh 命令走无 shell 参数数组;失败返回可读错误(如 OpenSSH 未安装) |

## 5. 技术方案概要

- **主进程 `src/main/ssh.ts`**(服务模块,与 git.ts 同层):
  - `detectSsh()`:定位 `ssh-keygen` 可执行文件;
  - `sshDir()` / `sshConfigPath()`:`%USERPROFILE%\.ssh`(受 `GS_TEST_SSH_DIR` 重定向);
  - `generateKeyPair(type, comment, fileName)`:执行
    `ssh-keygen -t ed25519 -C <comment> -f <path> -N ""`(RSA 加 `-b 4096`);
  - `readPublicKey(path?)`:读 `<path>.pub`;
  - `listKeyStatus()`:枚举 `~/.ssh` 下 `*.pub` 对应密钥状态;
  - `writeSshConfig(host, user, identityFile)`:幂等读写 `~/.ssh/config`(按 Host 块解析/替换);
- **IPC 域**:新增 `src/main/ipc/ssh.ts`(registerSshHandlers,channel 前缀 `ssh:`),聚合进 `ipc/index.ts`;
- **共享类型**:`shared/types.ts` 新增 `SshApi` 与 `SshKeyStatus` / `SshGenerateResult` 等;
- **preload**:`sshApi` 挂到 `window.gitSwitch.ssh`;
- **渲染层**:新页面 `src/renderer/src/pages/SshKeys.tsx`;`App.tsx` 菜单注册(快捷键变为 `Ctrl+1~8`);
- **冒烟测试**:`smoke.ts` 新增 SSH 链路(临时 `GS_TEST_SSH_DIR`:生成 ed25519 → 校验公钥存在 → 写 ssh config → 校验 Host 块 → 幂等重写)。

## 6. 里程碑与验收标准

| 版本 | 内容 | 验收标准 |
|---|---|---|
| S1 | 页面 + 生成 + 展示公钥 + 防覆盖 | 生成 ed25519 落盘 `~/.ssh/`,公钥可复制;重复生成被阻止;OpenSSH 缺失有指引 |
| S2 | ssh config 写入 + 周边增强 | 勾选配置 github.com → `~/.ssh/config` 生成 Host 块;新 clone 仓库 push 不再 Permission denied;keyDocs/模板已补充 |

## 7. 边界(暂不做)

- 密码短语(passphrase)设置与 ssh-agent 管理;
- 公钥自动上传 GitHub/GitLab(需 API token);
- 多密钥按 host 的完整路由管理(仅支持单 host 配置;多 host 通过重复添加实现);
- 「测试连接」验证按钮;
- mac/Linux 支持(当前仅 Windows)。

## 8. 评审记录

| 日期 | 决策 |
|---|---|
| 2026-08-03 | 入口:独立「SSH 密钥」页面;生成后:落盘 + 展示公钥,可选写 ssh config;密钥类型:ed25519 默认可切 RSA 4096 |
