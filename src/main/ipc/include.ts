/**
 * includeIf 自动切换域 IPC handler。
 */
import { safeHandle } from './helpers'
import {
  createIncludeRule,
  deleteIncludeRule,
  listIncludeRules,
  readActualIncludes,
  syncIncludeRules,
  toggleIncludeRule,
  updateIncludeRule
} from '../includeIf'

export function registerIncludeHandlers(): void {
  safeHandle('include:list', () => listIncludeRules())
  safeHandle('include:create', (input: { profileId: string; path: string }) => createIncludeRule(input))
  safeHandle('include:update', (id: string, input: { profileId: string; path: string }) => updateIncludeRule(id, input))
  safeHandle('include:delete', (id: string) => deleteIncludeRule(id))
  safeHandle('include:toggle', (id: string, enabled: boolean) => toggleIncludeRule(id, enabled))
  safeHandle('include:sync', () => syncIncludeRules())
  safeHandle('include:actual', () => readActualIncludes())
}
