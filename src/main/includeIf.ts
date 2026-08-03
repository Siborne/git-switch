import { randomUUID } from 'crypto'
import { join } from 'path'
import { appendLog } from './logger'
import { readJson, writeJson } from './storage'
import { listConfig, setConfig, setConfigFile, unsetConfig, unsetConfigFile, runGit, GitError } from './git'
import { getProfile } from './profiles'
import { existsSync, promises as fs } from 'fs'
import { createBackup } from './backup'
import { globalConfigFile, gitEnv, profileConfigDir, profileConfigFile } from './appConfig'
import type { ActualInclude, IncludeRule, SyncResult } from '../shared/types'

const RULES_FILE = 'includes.json'

async function readRules(): Promise<IncludeRule[]> {
  return readJson<IncludeRule[]>(RULES_FILE, [])
}

async function writeRules(rules: IncludeRule[]): Promise<void> {
  await writeJson(RULES_FILE, rules)
}

/** 规范化目录：~ 展开、反斜杠转正斜杠、去尾部斜杠（根目录如 D:/ 除外） */
export function normalizePath(raw: string): string {
  let p = raw.trim().replace(/\\/g, '/')
  if (p === '~' || p.startsWith('~/')) {
    p = (process.env.USERPROFILE ?? '').replace(/\\/g, '/') + p.slice(1)
  }
  p = p.replace(/\/+$/, '')
  if (p.length === 0) throw new Error('目录不能为空')
  return p
}

/** 生成 gitdir 匹配子句（大小写不敏感，Windows 路径友好） */
function gitdirClause(path: string, caseInsensitive = true): string {
  return `gitdir${caseInsensitive ? '/i' : ''}:${path}/`
}

/** git config key：includeif.gitdir/i:D:/work/.path（git 命令行 key 解析不支持引号包裹，点分直拼最稳） */
function includeIfKey(path: string): string {
  return `includeif.${gitdirClause(path)}.path`
}

export async function listIncludeRules(): Promise<IncludeRule[]> {
  return readRules()
}

export async function createIncludeRule(input: { profileId: string; path: string }): Promise<IncludeRule> {
  const path = normalizePath(input.path)
  const rules = await readRules()
  const dup = rules.find((r) => r.path.toLowerCase() === path.toLowerCase())
  if (dup) throw new Error(`目录已存在规则${dup.enabled ? '' : '（已禁用）'}：${dup.path}`)
  const now = new Date().toISOString()
  const rule: IncludeRule = {
    id: randomUUID(),
    profileId: input.profileId,
    path,
    enabled: true,
    createdAt: now,
    updatedAt: now
  }
  rules.unshift(rule)
  await writeRules(rules)
  await appendLog('include-create', { path, profileId: rule.profileId })
  return rule
}

export async function updateIncludeRule(id: string, input: { profileId: string; path: string }): Promise<IncludeRule> {
  const path = normalizePath(input.path)
  const rules = await readRules()
  const idx = rules.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error(`规则不存在: ${id}`)
  const dup = rules.find((r) => r.id !== id && r.path.toLowerCase() === path.toLowerCase())
  if (dup) throw new Error(`目录已存在规则：${dup.path}`)
  rules[idx] = { ...rules[idx], profileId: input.profileId, path, updatedAt: new Date().toISOString() }
  await writeRules(rules)
  await appendLog('include-update', { id, path, profileId: input.profileId })
  return rules[idx]
}

export async function deleteIncludeRule(id: string): Promise<void> {
  const rules = await readRules()
  const target = rules.find((r) => r.id === id)
  if (!target) throw new Error(`规则不存在: ${id}`)
  await writeRules(rules.filter((r) => r.id !== id))
  await appendLog('include-delete', { id, path: target.path })
}

export async function toggleIncludeRule(id: string, enabled: boolean): Promise<IncludeRule> {
  const rules = await readRules()
  const idx = rules.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error(`规则不存在: ${id}`)
  rules[idx] = { ...rules[idx], enabled, updatedAt: new Date().toISOString() }
  await writeRules(rules)
  await appendLog('include-toggle', { id, enabled })
  return rules[idx]
}

/**
 * 将启用的规则同步写入全局配置：
 * 1. 读取全局配置中现有的 includeIf 段，识别并移除本应用管理的段
 *    （path 指向 ~/.gitconfig-<profileId> 的即为本应用管理）
 * 2. 为每个启用规则生成配置集独立文件（git config --file 写入）
 * 3. 写入 includeIf 段（覆盖同名项，不影响用户手动配置的其他 includeIf）
 * 4. 不再被任何规则引用的配置文件会被清理
 */
export async function syncIncludeRules(): Promise<SyncResult> {
  const rules = await readRules()
  const enabled = rules.filter((r) => r.enabled)
  const applied: string[] = []
  const conflicts: string[] = []

  // 冲突检测：多个启用规则指向同一目录
  const seen = new Map<string, string>()
  for (const r of enabled) {
    const k = r.path.toLowerCase()
    if (seen.has(k)) {
      conflicts.push(`目录 ${r.path} 同时匹配多条规则（${seen.get(k)} 与 ${r.id}），按写入顺序后者覆盖前者`)
    } else {
      seen.set(k, r.id)
    }
  }

  // 0. 写前备份全局配置
  await createBackup([globalConfigFile()], '同步 includeIf 规则前备份')

  // 1. 清理本应用管理的旧 includeIf 段（listConfig 输出的点分 key 即 git 可解析格式，直接用于 unset）
  const entries = await listConfig({ env: gitEnv() })
  const managedKeys = new Set<string>()
  for (const e of entries) {
    if (e.key.startsWith('includeif.') && e.key.endsWith('.path')) {
      const profileId = /\.gitconfig-([0-9a-f-]+)$/i.exec(e.value)?.[1]
      if (profileId) {
        managedKeys.add(e.key)
      }
    }
  }
  for (const key of managedKeys) {
    try {
      await unsetConfig(key, 'global', { env: gitEnv() })
    } catch {
      // 忽略清理失败（段可能已被删除）
    }
  }

  // 2+3. 写入启用规则
  const referencedProfiles = new Set<string>()
  for (const r of enabled) {
    const profile = await getProfile(r.profileId)
    if (!profile) {
      conflicts.push(`规则 ${r.path} 引用的配置集不存在，已跳过`)
      continue
    }
    const file = profileConfigFile(r.profileId)
    referencedProfiles.add(r.profileId)

    // 生成配置集独立文件：先清空再写入（--file 会保留已有内容，需 unset 旧值）
    await unsetConfigFileAll(file)
    for (const item of profile.items) {
      await setConfigFile(file, item.key, item.value, { env: gitEnv() })
    }

    const key = includeIfKey(r.path)
    await setConfig(key, file, 'global', { env: gitEnv() })
    applied.push(`${r.path} → ${profile.name}`)
  }

  // 4. 清理不再被引用的配置文件
  const allFiles = await fs.readdir(profileConfigDir()).catch(() => [] as string[])
  for (const f of allFiles) {
    const m = /^\.gitconfig-([0-9a-f-]+)$/i.exec(f)
    if (m && !referencedProfiles.has(m[1])) {
      await fs.unlink(join(profileConfigDir(), f)).catch(() => undefined)
    }
  }

  await appendLog('include-sync', { applied: applied.length, conflicts: conflicts.length })
  return { applied, conflicts }
}

/** 清空配置集独立文件中的全部配置项（保持文件存在） */
async function unsetConfigFileAll(file: string): Promise<void> {
  if (!existsSync(file)) return
  try {
    const out = await runGit(['config', '--file', file, '--list', '--null'], { env: gitEnv() })
    const keys = out.split('\0').map((kv) => kv.split('\n')[0]).filter((k) => k.length > 0)
    for (const k of new Set(keys)) {
      await unsetConfigFile(file, k, { env: gitEnv() })
    }
  } catch (err) {
    if (err instanceof GitError && err.exitCode === 1) return // 空文件
    throw err
  }
}

/** 从全局配置读取实际的 includeIf 段（用于展示同步状态） */
export async function readActualIncludes(): Promise<ActualInclude[]> {
  const entries = await listConfig({ env: gitEnv() })
  const out: ActualInclude[] = []
  for (const e of entries) {
    if (e.key.startsWith('includeif.') && e.key.endsWith('.path')) {
      const dir = e.key.replace(/^includeif\./, '').replace(/\.path$/, '')
      out.push({ key: e.key, dir, file: e.value })
    }
  }
  return out
}
