/**
 * IPC 注册聚合入口：按域注册全部 handler，在 app.whenReady 后调用一次。
 * 新增领域时：在 src/main/ipc/ 下新建注册模块并在此汇总。
 */
import { registerGitHandlers } from './git'
import { registerBackupHandlers } from './backup'
import { registerProfilesHandlers } from './profiles'
import { registerDialogHandlers } from './dialog'
import { registerLogsHandlers } from './logs'
import { registerOnboardingHandlers } from './onboarding'
import { registerIncludeHandlers } from './include'
import { registerWindowHandlers } from './window'

export function registerIpcHandlers(): void {
  registerGitHandlers()
  registerBackupHandlers()
  registerProfilesHandlers()
  registerDialogHandlers()
  registerLogsHandlers()
  registerOnboardingHandlers()
  registerIncludeHandlers()
  registerWindowHandlers()
}

export { getCloseToTray } from './window'
