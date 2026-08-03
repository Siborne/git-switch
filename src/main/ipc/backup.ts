/**
 * backup 域 IPC handler。
 */
import { safeHandle } from './helpers'
import { diffBackup, listBackups, readBackupContent, restoreBackup } from '../backup'

export function registerBackupHandlers(): void {
  safeHandle('backup:list', () => listBackups())
  safeHandle('backup:restore', (id: string) => restoreBackup(id))
  safeHandle('backup:content', (id: string) => readBackupContent(id))
  safeHandle('backup:diff', (id: string) => diffBackup(id))
}
