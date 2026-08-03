import { contextBridge, ipcRenderer } from 'electron'
import type { GitApi, GitConfigEntry, GitOptions, GitScope } from '../shared/types'

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

const api = {
  appName: 'Git Switch',
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  },
  git: gitApi
}

contextBridge.exposeInMainWorld('gitSwitch', api)
