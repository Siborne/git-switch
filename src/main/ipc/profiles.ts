/**
 * profiles 域 IPC handler（含导入导出，涉及系统对话框与剪贴板）。
 */
import { clipboard, dialog } from 'electron'
import { promises as fs } from 'fs'
import { safeHandle } from './helpers'
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
} from '../profiles'
import type { ProfileInput } from '../../shared/types'

export function registerProfilesHandlers(): void {
  safeHandle('profiles:list', () => listProfiles())
  safeHandle('profiles:get', (id: string) => getProfile(id))
  safeHandle('profiles:create', (input: ProfileInput) => createProfile(input))
  safeHandle('profiles:update', (id: string, input: ProfileInput) => updateProfile(id, input))
  safeHandle('profiles:delete', (id: string) => deleteProfile(id))
  safeHandle('profiles:applyGlobal', (id: string) => applyProfileToGlobal(id))
  safeHandle('profiles:applyRepo', (id: string, cwd: string) => applyProfileToRepo(id, cwd))

  /* ---------- 导入 / 导出 ---------- */
  safeHandle('profiles:exportFile', async (includeSecrets: boolean) => {
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
  safeHandle('profiles:exportClipboard', async (includeSecrets: boolean) => {
    const payload = await exportProfiles(includeSecrets)
    clipboard.writeText(JSON.stringify(payload, null, 2))
  })
  safeHandle('profiles:importFile', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入配置集',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const text = await fs.readFile(result.filePaths[0], 'utf-8')
    return importProfiles(text)
  })
  safeHandle('profiles:importClipboard', async () => {
    const text = clipboard.readText()
    if (!text.trim()) throw new Error('剪贴板为空')
    return importProfiles(text)
  })
}
