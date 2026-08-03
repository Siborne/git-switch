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
  /** 附加环境变量（如 GIT_CONFIG_GLOBAL 用于重定向全局配置，测试隔离用） */
  env?: Record<string, string | undefined>
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
  /** 仓库 remote origin URL；未配置返回 null */
  remoteUrl: (dir: string) => Promise<string | null>
  /** 仓库当前分支名；detached HEAD 返回 null */
  currentBranch: (dir: string) => Promise<string | null>
  /** 仓库最近一次提交；无提交返回 null */
  lastCommit: (dir: string) => Promise<LastCommitInfo | null>
}

export interface LastCommitInfo {
  hash: string
  author: string
  subject: string
  date: string
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
  backup: BackupApi
  profiles: ProfilesApi
  dialog: DialogApi
  logs: LogsApi
  onboarding: OnboardingApi
  include: IncludeApi
  windowControls: WindowControlsApi
}

/* ---------- 备份 ---------- */

export interface BackupMeta {
  /** 备份点 id（时间戳） */
  id: string
  /** ISO 时间 */
  createdAt: string
  /** 触发备份的操作说明 */
  reason: string
  /** 被备份的原始文件路径（与备份文件按索引对应） */
  files: string[]
  /** 备份文件所在目录 */
  backupDir: string
}

export interface DiffLine {
  type: 'add' | 'remove' | 'same'
  text: string
}

export interface DiffFileResult {
  file: string
  hasBackup: boolean
  hasCurrent: boolean
  diff: DiffLine[]
  added: number
  removed: number
}

export interface BackupApi {
  /** 备份点列表（新→旧） */
  list: () => Promise<BackupMeta[]>
  /** 回滚到指定备份点（回滚前自动保护当前状态） */
  restore: (id: string) => Promise<{ restored: string[]; protection: BackupMeta | null }>
  /** 读取备份点文件内容（查看用） */
  content: (id: string) => Promise<{ file: string; content: string }[]>
  /** 对比备份点与当前文件的差异（备份 = 旧，当前 = 新） */
  diff: (id: string) => Promise<DiffFileResult[]>
}

/* ---------- 配置集 ---------- */

export interface ProfileItem {
  key: string
  value: string
}

export interface Profile {
  id: string
  name: string
  description?: string
  items: ProfileItem[]
  createdAt: string
  updatedAt: string
}

export interface ProfileInput {
  name: string
  description?: string
  items: ProfileItem[]
}

export interface ApplyResult {
  backedUp: boolean
  applied: number
}

export interface ExportPayload {
  version: 1
  app: 'git-switch'
  exportedAt: string
  profiles: {
    name: string
    description?: string
    items: ProfileItem[]
  }[]
}

export interface ImportResult {
  created: string[]
  skipped: string[]
}

export interface ProfilesApi {
  list: () => Promise<Profile[]>
  get: (id: string) => Promise<Profile | null>
  create: (input: ProfileInput) => Promise<Profile>
  update: (id: string, input: ProfileInput) => Promise<Profile>
  remove: (id: string) => Promise<void>
  /** 应用到全局（覆盖同名项 + 保留无关项，写前备份） */
  applyGlobal: (id: string) => Promise<ApplyResult>
  /** 应用到仓库 local scope（写前备份） */
  applyRepo: (id: string, cwd: string) => Promise<ApplyResult>
  /** 导出到 JSON 文件（弹保存对话框）；返回保存路径或 null（取消） */
  exportFile: (includeSecrets: boolean) => Promise<string | null>
  /** 导出到剪贴板 */
  exportClipboard: (includeSecrets: boolean) => Promise<void>
  /** 从 JSON 文件导入（弹打开对话框）；返回 null（取消）或导入结果 */
  importFile: () => Promise<ImportResult | null>
  /** 从剪贴板导入 */
  importClipboard: () => Promise<ImportResult>
}

/* ---------- 其他 ---------- */

export interface DialogApi {
  /** 系统目录选择器，取消返回 null */
  pickDirectory: () => Promise<string | null>
}

export interface LogEntry {
  ts: string
  action: string
  detail?: string
}

export interface LogsApi {
  list: () => Promise<LogEntry[]>
}

export interface OnboardingApi {
  /** 是否已完成首次启动引导 */
  status: () => Promise<boolean>
  /** 标记引导完成 */
  markDone: () => Promise<void>
}

export interface WindowControlsApi {
  /** 最小化窗口 */
  minimize: () => void
  /** 最大化 / 还原 */
  toggleMaximize: () => void
  /** 关闭到系统托盘 */
  hide: () => void
  /** 监听最大化状态变化；返回取消订阅函数 */
  onMaximizedChange: (cb: (maximized: boolean) => void) => () => void
}

/* ---------- includeIf 自动切换 ---------- */

export interface IncludeRule {
  id: string
  profileId: string
  /** 规范化后的目录（正斜杠），如 D:/work */
  path: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SyncResult {
  /** 实际写入的规则（enabled 且已同步） */
  applied: string[]
  /** 冲突提示 */
  conflicts: string[]
}

export interface ActualInclude {
  key: string
  dir: string
  file: string
}

export interface IncludeApi {
  list: () => Promise<IncludeRule[]>
  create: (input: { profileId: string; path: string }) => Promise<IncludeRule>
  update: (id: string, input: { profileId: string; path: string }) => Promise<IncludeRule>
  remove: (id: string) => Promise<void>
  toggle: (id: string, enabled: boolean) => Promise<IncludeRule>
  /** 同步规则到全局配置（生成配置集独立文件 + 写 includeIf 段） */
  sync: () => Promise<SyncResult>
  /** 读取全局配置中实际的 includeIf 段 */
  actual: () => Promise<ActualInclude[]>
}
