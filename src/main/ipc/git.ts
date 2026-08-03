/**
 * git 域 IPC handler。
 */
import { safeHandle } from './helpers'
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
} from '../git'
import type { GitOptions, GitScope } from '../../shared/types'

export function registerGitHandlers(): void {
  safeHandle('git:find', () => findGit())
  safeHandle('git:version', () => gitVersion())
  safeHandle('git:listConfig', (opts?: GitOptions) => listConfig(opts))
  safeHandle('git:getConfig', (key: string, opts?: GitOptions) => getConfig(key, opts))
  safeHandle('git:setConfig', (key: string, value: string, scope?: GitScope, opts?: GitOptions) => setConfig(key, value, scope, opts))
  safeHandle('git:unsetConfig', (key: string, scope?: GitScope, opts?: GitOptions) => unsetConfig(key, scope, opts))
  safeHandle('git:isRepo', (dir: string) => isGitRepo(dir))
  safeHandle('git:remoteUrl', (dir: string) => getRemoteUrl(dir))
  safeHandle('git:currentBranch', (dir: string) => getCurrentBranch(dir))
  safeHandle('git:lastCommit', (dir: string) => getLastCommit(dir))
}
