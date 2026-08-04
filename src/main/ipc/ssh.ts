/**
 * ssh 域 IPC handler（SSH 密钥管理）。
 */
import { safeHandle } from './helpers'
import {
  detectSshKeygen,
  generateKeyPair,
  listKeyStatus,
  readSshConfig,
  removeSshConfigHost,
  writeSshConfigHost
} from '../ssh'
import type { SshKeyType } from '../../shared/types'

export function registerSshHandlers(): void {
  safeHandle('ssh:detect', async () => (await detectSshKeygen()) !== null)
  safeHandle('ssh:listKeys', () => listKeyStatus())
  safeHandle('ssh:generate', (type: SshKeyType, comment?: string, fileName?: string) =>
    generateKeyPair({ type, comment, fileName })
  )
  safeHandle('ssh:readConfig', () => readSshConfig())
  safeHandle('ssh:configureHost', (host: string, opts: { user?: string; identityFile?: string }) =>
    writeSshConfigHost(host, opts)
  )
  safeHandle('ssh:removeHost', (host: string) => removeSshConfigHost(host))
}
