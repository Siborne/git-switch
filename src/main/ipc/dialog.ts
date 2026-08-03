/**
 * dialog 域 IPC handler。
 */
import { dialog } from 'electron'
import { safeHandle } from './helpers'

export function registerDialogHandlers(): void {
  safeHandle('dialog:pickDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 Git 仓库目录',
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
