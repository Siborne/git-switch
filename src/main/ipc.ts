import { ipcMain } from 'electron'
import {
  findGit,
  getConfig,
  gitVersion,
  isGitRepo,
  listConfig,
  setConfig,
  unsetConfig
} from './git'
import type { GitOptions, GitScope } from '../shared/types'

/** 注册 git 服务相关 IPC handler，在 app.whenReady 后调用。 */
export function registerIpcHandlers(): void {
  ipcMain.handle('git:find', () => findGit())
  ipcMain.handle('git:version', () => gitVersion())
  ipcMain.handle('git:listConfig', (_event, opts: GitOptions | undefined) => listConfig(opts))
  ipcMain.handle('git:getConfig', (_event, key: string, opts: GitOptions | undefined) => getConfig(key, opts))
  ipcMain.handle('git:setConfig', (_event, key: string, value: string, scope: GitScope | undefined, opts: GitOptions | undefined) =>
    setConfig(key, value, scope, opts)
  )
  ipcMain.handle('git:unsetConfig', (_event, key: string, scope: GitScope | undefined, opts: GitOptions | undefined) =>
    unsetConfig(key, scope, opts)
  )
  ipcMain.handle('git:isRepo', (_event, dir: string) => isGitRepo(dir))
}
