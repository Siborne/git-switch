/**
 * logs 域 IPC handler。
 */
import { safeHandle } from './helpers'
import { readLog } from '../logger'

export function registerLogsHandlers(): void {
  safeHandle('logs:list', () => readLog())
}
