import { ipcMain, dialog } from 'electron'
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
import { createBackup, listBackups, restoreBackup } from './backup'
import {
  applyProfileToGlobal,
  applyProfileToRepo,
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile
} from './profiles'
import type { ProfileInput } from './profiles'
import { isOnboardingDone, markOnboardingDone, readLog } from './store'
import {
  createIncludeRule,
  deleteIncludeRule,
  listIncludeRules,
  readActualIncludes,
  syncIncludeRules,
  toggleIncludeRule,
  updateIncludeRule
} from './includeIf'

/** 注册 git / backup / profiles / dialog / logs 相关 IPC handler，在 app.whenReady 后调用。 */
export function registerIpcHandlers(): void {
  /* ---------- git ---------- */
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

  /* ---------- backup ---------- */
  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:restore', (_event, id: string) => restoreBackup(id))

  /* ---------- profiles ---------- */
  ipcMain.handle('profiles:list', () => listProfiles())
  ipcMain.handle('profiles:get', (_event, id: string) => getProfile(id))
  ipcMain.handle('profiles:create', (_event, input: ProfileInput) => createProfile(input))
  ipcMain.handle('profiles:update', (_event, id: string, input: ProfileInput) => updateProfile(id, input))
  ipcMain.handle('profiles:delete', (_event, id: string) => deleteProfile(id))
  ipcMain.handle('profiles:applyGlobal', (_event, id: string) => applyProfileToGlobal(id))
  ipcMain.handle('profiles:applyRepo', (_event, id: string, cwd: string) => applyProfileToRepo(id, cwd))

  /* ---------- dialog ---------- */
  ipcMain.handle('dialog:pickDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 Git 仓库目录',
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  /* ---------- logs ---------- */
  ipcMain.handle('logs:list', () => readLog())

  /* ---------- onboarding ---------- */
  ipcMain.handle('onboarding:status', () => isOnboardingDone())
  ipcMain.handle('onboarding:markDone', () => markOnboardingDone())

  /* ---------- includeIf 自动切换 ---------- */
  ipcMain.handle('include:list', () => listIncludeRules())
  ipcMain.handle('include:create', (_event, input: { profileId: string; path: string }) => createIncludeRule(input))
  ipcMain.handle('include:update', (_event, id: string, input: { profileId: string; path: string }) => updateIncludeRule(id, input))
  ipcMain.handle('include:delete', (_event, id: string) => deleteIncludeRule(id))
  ipcMain.handle('include:toggle', (_event, id: string, enabled: boolean) => toggleIncludeRule(id, enabled))
  ipcMain.handle('include:sync', () => syncIncludeRules())
  ipcMain.handle('include:actual', () => readActualIncludes())
}
