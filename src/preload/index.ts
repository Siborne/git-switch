import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActualInclude,
  ApplyResult,
  BackupApi,
  BackupMeta,
  DialogApi,
  GitApi,
  GitConfigEntry,
  GitOptions,
  GitScope,
  IncludeApi,
  IncludeRule,
  ImportResult,
  LogEntry,
  LogsApi,
  OnboardingApi,
  Profile,
  ProfileInput,
  ProfilesApi,
  SyncResult
} from '../shared/types'

const gitApi: GitApi = {
  find: (): Promise<string | null> => ipcRenderer.invoke('git:find'),
  version: (): Promise<string> => ipcRenderer.invoke('git:version'),
  listConfig: (opts?: GitOptions): Promise<GitConfigEntry[]> =>
    ipcRenderer.invoke('git:listConfig', opts) as Promise<GitConfigEntry[]>,
  getConfig: (key: string, opts?: GitOptions): Promise<string | null> => ipcRenderer.invoke('git:getConfig', key, opts),
  setConfig: (key: string, value: string, scope?: GitScope, opts?: GitOptions): Promise<void> =>
    ipcRenderer.invoke('git:setConfig', key, value, scope, opts),
  unsetConfig: (key: string, scope?: GitScope, opts?: GitOptions): Promise<void> =>
    ipcRenderer.invoke('git:unsetConfig', key, scope, opts),
  isRepo: (dir: string): Promise<boolean> => ipcRenderer.invoke('git:isRepo', dir)
}

const backupApi: BackupApi = {
  list: (): Promise<BackupMeta[]> => ipcRenderer.invoke('backup:list') as Promise<BackupMeta[]>,
  restore: (id: string): Promise<{ restored: string[]; protection: BackupMeta | null }> =>
    ipcRenderer.invoke('backup:restore', id) as Promise<{ restored: string[]; protection: BackupMeta | null }>
}

const profilesApi: ProfilesApi = {
  list: (): Promise<Profile[]> => ipcRenderer.invoke('profiles:list') as Promise<Profile[]>,
  get: (id: string): Promise<Profile | null> => ipcRenderer.invoke('profiles:get', id) as Promise<Profile | null>,
  create: (input: ProfileInput): Promise<Profile> => ipcRenderer.invoke('profiles:create', input) as Promise<Profile>,
  update: (id: string, input: ProfileInput): Promise<Profile> =>
    ipcRenderer.invoke('profiles:update', id, input) as Promise<Profile>,
  remove: (id: string): Promise<void> => ipcRenderer.invoke('profiles:delete', id) as Promise<void>,
  applyGlobal: (id: string): Promise<ApplyResult> => ipcRenderer.invoke('profiles:applyGlobal', id) as Promise<ApplyResult>,
  applyRepo: (id: string, cwd: string): Promise<ApplyResult> =>
    ipcRenderer.invoke('profiles:applyRepo', id, cwd) as Promise<ApplyResult>,
  exportFile: (includeSecrets: boolean): Promise<string | null> =>
    ipcRenderer.invoke('profiles:exportFile', includeSecrets) as Promise<string | null>,
  exportClipboard: (includeSecrets: boolean): Promise<void> => ipcRenderer.invoke('profiles:exportClipboard', includeSecrets) as Promise<void>,
  importFile: (): Promise<ImportResult | null> => ipcRenderer.invoke('profiles:importFile') as Promise<ImportResult | null>,
  importClipboard: (): Promise<ImportResult> => ipcRenderer.invoke('profiles:importClipboard') as Promise<ImportResult>
}

const dialogApi: DialogApi = {
  pickDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickDirectory') as Promise<string | null>
}

const logsApi: LogsApi = {
  list: (): Promise<LogEntry[]> => ipcRenderer.invoke('logs:list') as Promise<LogEntry[]>
}

const onboardingApi: OnboardingApi = {
  status: (): Promise<boolean> => ipcRenderer.invoke('onboarding:status') as Promise<boolean>,
  markDone: (): Promise<void> => ipcRenderer.invoke('onboarding:markDone') as Promise<void>
}

const includeApi: IncludeApi = {
  list: (): Promise<IncludeRule[]> => ipcRenderer.invoke('include:list') as Promise<IncludeRule[]>,
  create: (input: { profileId: string; path: string }): Promise<IncludeRule> =>
    ipcRenderer.invoke('include:create', input) as Promise<IncludeRule>,
  update: (id: string, input: { profileId: string; path: string }): Promise<IncludeRule> =>
    ipcRenderer.invoke('include:update', id, input) as Promise<IncludeRule>,
  remove: (id: string): Promise<void> => ipcRenderer.invoke('include:delete', id) as Promise<void>,
  toggle: (id: string, enabled: boolean): Promise<IncludeRule> =>
    ipcRenderer.invoke('include:toggle', id, enabled) as Promise<IncludeRule>,
  sync: (): Promise<SyncResult> => ipcRenderer.invoke('include:sync') as Promise<SyncResult>,
  actual: (): Promise<ActualInclude[]> => ipcRenderer.invoke('include:actual') as Promise<ActualInclude[]>
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
  include: includeApi
}

contextBridge.exposeInMainWorld('gitSwitch', api)
