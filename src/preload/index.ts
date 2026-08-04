import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActualInclude,
  ApplyResult,
  BackupApi,
  BackupMeta,
  DialogApi,
  DiffFileResult,
  GitApi,
  GitConfigEntry,
  GitOptions,
  GitScope,
  IncludeApi,
  IncludeRule,
  ImportResult,
  LastCommitInfo,
  LogEntry,
  LogsApi,
  OnboardingApi,
  Profile,
  ProfileInput,
  ProfilesApi,
  SshApi,
  SshGenerateResult,
  SshHostOptions,
  SshKeyStatus,
  SshKeyType,
  SyncResult,
  WindowControlsApi
} from '../shared/types'

/**
 * 统一 IPC 调用入口：
 * - 泛型化，消除各处 `as Promise<T>` 强转；
 * - 剥离 Electron 的 "Error invoking remote method" 包装前缀，
 *   让渲染层拿到的错误消息就是主进程抛出的原始 message。
 */
function unwrapIpcError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  // 兼容不同 Electron 版本的前缀变体：Error invoking remote method 'channel': Error: msg
  const stripped = msg.replace(/^Error invoking remote method '[^']*':\s*(?:Error:\s*)?/, '')
  return new Error(stripped || msg)
}

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args).catch((err: unknown) => {
    throw unwrapIpcError(err)
  }) as Promise<T>
}

const gitApi: GitApi = {
  find: (): Promise<string | null> => invoke('git:find'),
  version: (): Promise<string> => invoke('git:version'),
  listConfig: (opts?: GitOptions): Promise<GitConfigEntry[]> => invoke('git:listConfig', opts),
  getConfig: (key: string, opts?: GitOptions): Promise<string | null> => invoke('git:getConfig', key, opts),
  setConfig: (key: string, value: string, scope?: GitScope, opts?: GitOptions): Promise<void> =>
    invoke('git:setConfig', key, value, scope, opts),
  unsetConfig: (key: string, scope?: GitScope, opts?: GitOptions): Promise<void> =>
    invoke('git:unsetConfig', key, scope, opts),
  isRepo: (dir: string): Promise<boolean> => invoke('git:isRepo', dir),
  remoteUrl: (dir: string): Promise<string | null> => invoke('git:remoteUrl', dir),
  currentBranch: (dir: string): Promise<string | null> => invoke('git:currentBranch', dir),
  lastCommit: (dir: string): Promise<LastCommitInfo | null> => invoke('git:lastCommit', dir)
}

const backupApi: BackupApi = {
  list: (): Promise<BackupMeta[]> => invoke('backup:list'),
  restore: (id: string): Promise<{ restored: string[]; protection: BackupMeta | null }> => invoke('backup:restore', id),
  content: (id: string): Promise<{ file: string; content: string }[]> => invoke('backup:content', id),
  diff: (id: string): Promise<DiffFileResult[]> => invoke('backup:diff', id)
}

const profilesApi: ProfilesApi = {
  list: (): Promise<Profile[]> => invoke('profiles:list'),
  get: (id: string): Promise<Profile | null> => invoke('profiles:get', id),
  create: (input: ProfileInput): Promise<Profile> => invoke('profiles:create', input),
  update: (id: string, input: ProfileInput): Promise<Profile> => invoke('profiles:update', id, input),
  remove: (id: string): Promise<void> => invoke('profiles:delete', id),
  applyGlobal: (id: string): Promise<ApplyResult> => invoke('profiles:applyGlobal', id),
  applyRepo: (id: string, cwd: string): Promise<ApplyResult> => invoke('profiles:applyRepo', id, cwd),
  exportFile: (includeSecrets: boolean): Promise<string | null> => invoke('profiles:exportFile', includeSecrets),
  exportClipboard: (includeSecrets: boolean): Promise<void> => invoke('profiles:exportClipboard', includeSecrets),
  importFile: (): Promise<ImportResult | null> => invoke('profiles:importFile'),
  importClipboard: (): Promise<ImportResult> => invoke('profiles:importClipboard')
}

const dialogApi: DialogApi = {
  pickDirectory: (): Promise<string | null> => invoke('dialog:pickDirectory')
}

const logsApi: LogsApi = {
  list: (): Promise<LogEntry[]> => invoke('logs:list')
}

const onboardingApi: OnboardingApi = {
  status: (): Promise<boolean> => invoke('onboarding:status'),
  markDone: (): Promise<void> => invoke('onboarding:markDone')
}

const includeApi: IncludeApi = {
  list: (): Promise<IncludeRule[]> => invoke('include:list'),
  create: (input: { profileId: string; path: string }): Promise<IncludeRule> => invoke('include:create', input),
  update: (id: string, input: { profileId: string; path: string }): Promise<IncludeRule> =>
    invoke('include:update', id, input),
  remove: (id: string): Promise<void> => invoke('include:delete', id),
  toggle: (id: string, enabled: boolean): Promise<IncludeRule> => invoke('include:toggle', id, enabled),
  sync: (): Promise<SyncResult> => invoke('include:sync'),
  actual: (): Promise<ActualInclude[]> => invoke('include:actual')
}

const sshApi: SshApi = {
  detect: (): Promise<boolean> => invoke('ssh:detect'),
  listKeys: (): Promise<SshKeyStatus[]> => invoke('ssh:listKeys'),
  generate: (type: SshKeyType, comment?: string, fileName?: string): Promise<SshGenerateResult> =>
    invoke('ssh:generate', type, comment, fileName),
  readConfig: (): Promise<string> => invoke('ssh:readConfig'),
  configureHost: (host: string, opts?: SshHostOptions): Promise<string> => invoke('ssh:configureHost', host, opts),
  removeHost: (host: string): Promise<string> => invoke('ssh:removeHost', host)
}

const windowControls: WindowControlsApi = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('window:toggleMaximize'),
  hide: (): void => ipcRenderer.send('window:hide'),
  setCloseBehavior: (toTray: boolean): void => ipcRenderer.send('window:setCloseBehavior', toTray),
  onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
    const listener = (_e: unknown, maximized: boolean): void => cb(maximized)
    ipcRenderer.on('window:maximized', listener)
    return () => {
      ipcRenderer.removeListener('window:maximized', listener)
    }
  }
}

const api = {
  appName: 'Git Switch',
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  },
  git: gitApi,
  backup: backupApi,
  profiles: profilesApi,
  dialog: dialogApi,
  logs: logsApi,
  onboarding: onboardingApi,
  include: includeApi,
  ssh: sshApi,
  windowControls
}

contextBridge.exposeInMainWorld('gitSwitch', api)
