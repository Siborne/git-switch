/** 主进程 / preload / 渲染层共享的类型定义（纯类型，无运行时依赖） */

export interface GitConfigEntry {
  /** 配置项 key，如 user.name */
  key: string
  /** 配置项值 */
  value: string
  /** scope：system / global / local / worktree / command */
  scope: string
  /** 配置文件路径（已去掉 file: 前缀） */
  origin: string
}

export interface GitOptions {
  /** 工作目录（local scope 或仓库检测时需要） */
  cwd?: string
  /** 命令超时，默认 30s */
  timeoutMs?: number
}

export type GitScope = 'system' | 'global' | 'local' | 'worktree'

export interface GitApi {
  /** 定位 git 可执行文件，未找到返回 null */
  find: () => Promise<string | null>
  /** git --version 输出 */
  version: () => Promise<string>
  /** 列出全部配置（含 scope/origin） */
  listConfig: (opts?: GitOptions) => Promise<GitConfigEntry[]>
  /** 读取单个配置项，不存在返回 null */
  getConfig: (key: string, opts?: GitOptions) => Promise<string | null>
  /** 写入配置项 */
  setConfig: (key: string, value: string, scope?: GitScope, opts?: GitOptions) => Promise<void>
  /** 删除配置项 */
  unsetConfig: (key: string, scope?: GitScope, opts?: GitOptions) => Promise<void>
  /** 判断目录是否为 git 仓库 */
  isRepo: (dir: string) => Promise<boolean>
}

export interface GitSwitchApi {
  appName: string
  platform: string
  versions: {
    electron: string
    node: string
    chrome: string
  }
  git: GitApi
}
