import { ipcMain, dialog, clipboard, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import {
  findGit,
  getConfig,
  getCurrentBranch,
  getLastCommit,
  getRemoteUrl,
  gitVersion,
  isGitRepo,
  listConfig,
  setConfig,
  unsetConfig
} from './git'
import type { GitOptions, GitScope } from '../shared/types'
import { createBackup, diffBackup, listBackups, readBackupContent, restoreBackup } from './backup'
import {
  applyProfileToGlobal,
  applyProfileToRepo,
  createProfile,
  deleteProfile,
  exportProfiles,
  getProfile,
  importProfiles,
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
  ipcMain.handle('git:remoteUrl', (_event, dir: string) => getRemoteUrl(dir))
  ipcMain.handle('git:currentBranch', (_event, dir: string) => getCurrentBranch(dir))
  ipcMain.handle('git:lastCommit', (_event, dir: string) => getLastCommit(dir))

  /* ---------- backup ---------- */
  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:restore', (_event, id: string) => restoreBackup(id))
  ipcMain.handle('backup:content', (_event, id: string) => readBackupContent(id))
  ipcMain.handle('backup:diff', (_event, id: string) => diffBackup(id))

  /* ---------- profiles ---------- */
  ipcMain.handle('profiles:list', () => listProfiles())
  ipcMain.handle('profiles:get', (_event, id: string) => getProfile(id))
  ipcMain.handle('profiles:create', (_event, input: ProfileInput) => createProfile(input))
  ipcMain.handle('profiles:update', (_event, id: string, input: ProfileInput) => updateProfile(id, input))
  ipcMain.handle('profiles:delete', (_event, id: string) => deleteProfile(id))
  ipcMain.handle('profiles:applyGlobal', (_event, id: string) => applyProfileToGlobal(id))
  ipcMain.handle('profiles:applyRepo', (_event, id: string, cwd: string) => applyProfileToRepo(id, cwd))

  /* ---------- profiles 导入导出 ---------- */
  ipcMain.handle('profiles:exportFile', async (_event, includeSecrets: boolean) => {
    const payload = await exportProfiles(includeSecrets)
    const result = await dialog.showSaveDialog({
      title: '导出配置集',
      defaultPath: `git-switch-profiles-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return result.filePath
  })
  ipcMain.handle('profiles:exportClipboard', async (_event, includeSecrets: boolean) => {
    const payload = await exportProfiles(includeSecrets)
    clipboard.writeText(JSON.stringify(payload, null, 2))
  })
  ipcMain.handle('profiles:importFile', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入配置集',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const text = await fs.readFile(result.filePaths[0], 'utf-8')
    return importProfiles(text)
  })
  ipcMain.handle('profiles:importClipboard', async () => {
    const text = clipboard.readText()
    if (!text.trim()) throw new Error('剪贴板为空')
    return importProfiles(text)
  })

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

  /* ---------- 窗口控制（自定义标题栏） ---------- */
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:hide', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide()
  })

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
