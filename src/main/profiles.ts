import { randomUUID } from 'crypto'
import { join } from 'path'
import { appendLog, readJson, writeJson } from './store'
import { createBackup } from './backup'
import { setConfig, unsetConfig, runGit } from './git'
import type { GitScope } from '../shared/types'

export interface ProfileItem {
  key: string
  value: string
}

export interface Profile {
  id: string
  name: string
  description?: string
  items: ProfileItem[]
  createdAt: string
  updatedAt: string
}

export interface ProfileInput {
  name: string
  description?: string
  items: ProfileItem[]
}

const PROFILE_FILE = 'profiles.json'

async function readProfiles(): Promise<Profile[]> {
  return readJson<Profile[]>(PROFILE_FILE, [])
}

async function writeProfiles(profiles: Profile[]): Promise<void> {
  await writeJson(PROFILE_FILE, profiles)
}

/** 校验配置项 key 格式（section.key[.subkey...]），防止写入非法配置 */
function isValidKey(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/.test(key)
}

function validateInput(input: ProfileInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('配置集名称不能为空')
  }
  for (const item of input.items ?? []) {
    if (!isValidKey(item.key)) {
      throw new Error(`非法的配置项 key: ${item.key}（应为 section.name 格式，如 user.email）`)
    }
  }
}

export async function listProfiles(): Promise<Profile[]> {
  return readProfiles()
}

export async function getProfile(id: string): Promise<Profile | null> {
  const list = await readProfiles()
  return list.find((p) => p.id === id) ?? null
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  validateInput(input)
  const now = new Date().toISOString()
  const profile: Profile = {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    items: (input.items ?? []).map((i) => ({ key: i.key.trim(), value: i.value })),
    createdAt: now,
    updatedAt: now
  }
  const list = await readProfiles()
  list.unshift(profile)
  await writeProfiles(list)
  await appendLog('profile-create', { name: profile.name })
  return profile
}

export async function updateProfile(id: string, input: ProfileInput): Promise<Profile> {
  validateInput(input)
  const list = await readProfiles()
  const idx = list.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error(`配置集不存在: ${id}`)
  const updated: Profile = {
    ...list[idx],
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    items: (input.items ?? []).map((i) => ({ key: i.key.trim(), value: i.value })),
    updatedAt: new Date().toISOString()
  }
  list[idx] = updated
  await writeProfiles(list)
  await appendLog('profile-update', { name: updated.name })
  return updated
}

export async function deleteProfile(id: string): Promise<void> {
  const list = await readProfiles()
  const target = list.find((p) => p.id === id)
  if (!target) throw new Error(`配置集不存在: ${id}`)
  await writeProfiles(list.filter((p) => p.id !== id))
  await appendLog('profile-delete', { name: target.name })
}

/** 全局配置文件路径（%USERPROFILE%\.gitconfig） */
function globalConfigFile(): string {
  return join(process.env.USERPROFILE ?? '', '.gitconfig')
}

/**
 * 应用配置集到全局：覆盖同名项 + 保留无关项。
 * 写前自动备份全局配置文件。
 */
export async function applyProfileToGlobal(id: string): Promise<{ backedUp: boolean; applied: number }> {
  const profile = await getProfile(id)
  if (!profile) throw new Error(`配置集不存在: ${id}`)

  const backup = await createBackup([globalConfigFile()], `应用配置集「${profile.name}」到全局`)
  for (const item of profile.items) {
    await setConfig(item.key, item.value, 'global')
  }
  await appendLog('apply-global', { profile: profile.name, applied: profile.items.length })
  return { backedUp: backup !== null, applied: profile.items.length }
}

/**
 * 应用配置集到指定仓库（local scope）：覆盖同名项 + 保留无关项。
 * 写前自动备份该仓库的 .git/config。
 */
export async function applyProfileToRepo(id: string, cwd: string): Promise<{ backedUp: boolean; applied: number }> {
  const profile = await getProfile(id)
  if (!profile) throw new Error(`配置集不存在: ${id}`)

  // 校验目标确实是 git 仓库
  try {
    await runGit(['rev-parse', '--git-dir'], { cwd })
  } catch {
    throw new Error(`不是有效的 git 仓库目录: ${cwd}`)
  }

  const localFile = join(cwd, '.git', 'config')
  const backup = await createBackup([localFile], `应用配置集「${profile.name}」到仓库 ${cwd}`)
  for (const item of profile.items) {
    await setConfig(item.key, item.value, 'local', { cwd })
  }
  await appendLog('apply-local', { profile: profile.name, repo: cwd, applied: profile.items.length })
  return { backedUp: backup !== null, applied: profile.items.length }
}

/** 供后续 includeIf 等场景复用：删除 scope 中的配置项 */
export async function removeScopeItem(key: string, scope: GitScope, cwd?: string): Promise<void> {
  await unsetConfig(key, scope, cwd ? { cwd } : undefined)
}

/* ---------- 导入 / 导出 ---------- */

/** 敏感配置项匹配（导出脱敏用） */
const SENSITIVE_RE = /(proxy|extraheader|token|password|secret|credential|passwd)/i

export interface ExportedProfile {
  name: string
  description?: string
  items: ProfileItem[]
}

export interface ExportPayload {
  version: 1
  app: 'git-switch'
  exportedAt: string
  profiles: ExportedProfile[]
}

export interface ImportResult {
  created: string[]
  skipped: string[]
}

/** 导出全部配置集；includeSecrets=false 时敏感项（token/proxy 等）脱敏打码 */
export async function exportProfiles(includeSecrets: boolean): Promise<ExportPayload> {
  const profiles = await readProfiles()
  return {
    version: 1,
    app: 'git-switch',
    exportedAt: new Date().toISOString(),
    profiles: profiles.map((p) => ({
      name: p.name,
      description: p.description,
      items: includeSecrets
        ? p.items.map((i) => ({ ...i }))
        : p.items.map((i) => ({ key: i.key, value: SENSITIVE_RE.test(i.key) ? '••••' : i.value }))
    }))
  }
}

/** 从 JSON 文本导入配置集；同名配置集跳过并在结果中标注 */
export async function importProfiles(jsonText: string): Promise<ImportResult> {
  let payload: unknown
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('JSON 解析失败，请确认文件格式正确')
  }
  const obj = payload as Partial<ExportPayload>
  if (obj.app !== 'git-switch' || !Array.isArray(obj.profiles)) {
    throw new Error('不是有效的 Git Switch 导出文件（缺少 app/profiles 字段）')
  }
  const existing = await readProfiles()
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()))
  const result: ImportResult = { created: [], skipped: [] }

  for (const p of obj.profiles) {
    const name = p?.name?.trim()
    if (!name) continue
    validateInput({ name, description: p?.description, items: p?.items ?? [] })
    if (existingNames.has(name.toLowerCase())) {
      result.skipped.push(name)
      continue
    }
    await createProfile({ name, description: p?.description, items: (p?.items ?? []).map((i) => ({ key: i.key, value: i.value })) })
    existingNames.add(name.toLowerCase())
    result.created.push(name)
  }
  if (result.created.length === 0 && result.skipped.length === 0) {
    throw new Error('导出文件中没有可导入的配置集')
  }
  return result
}
