import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export interface LogEntry {
  ts: string
  action: string
  detail?: string
}

const LOG_FILE = 'operations.log'

/** 测试/工具可覆盖的数据目录（默认 %APPDATA%/git-switch） */
let dataDirOverride: string | null = null

export function setDataDir(dir: string): void {
  dataDirOverride = dir
}

/** 应用数据目录：%APPDATA%/git-switch */
export function dataDir(): string {
  return dataDirOverride ?? join(app.getPath('appData'), 'git-switch')
}

/** 确保数据目录存在并返回路径 */
export async function ensureDataDir(): Promise<string> {
  const dir = dataDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/** 读取 JSON 文件，不存在或损坏时返回 fallback */
export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(join(dataDir(), name), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 原子写入 JSON：先写临时文件再 rename，避免写一半损坏 */
export async function writeJson<T>(name: string, data: T): Promise<void> {
  const dir = await ensureDataDir()
  const target = join(dir, name)
  const tmp = join(dir, `${name}.tmp`)
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}

/** 追加一条操作日志（append 模式，天然防并发丢行） */
export async function appendLog(action: string, detail?: unknown): Promise<void> {
  const dir = await ensureDataDir()
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    action,
    detail: detail === undefined ? undefined : JSON.stringify(detail)
  }
  await fs.appendFile(join(dir, LOG_FILE), `${JSON.stringify(entry)}\n`, 'utf-8')
}

/** 读取全部操作日志（新→旧） */
export async function readLog(): Promise<LogEntry[]> {
  try {
    const raw = await fs.readFile(join(dataDir(), LOG_FILE), 'utf-8')
    const entries = raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try {
          return JSON.parse(l) as LogEntry
        } catch {
          return null
        }
      })
      .filter((e): e is LogEntry => e !== null)
    return entries.reverse()
  } catch {
    return []
  }
}

/* ---------- onboarding ---------- */

const ONBOARDING_FILE = 'onboarding.json'

/** 是否已完成首次启动引导 */
export async function isOnboardingDone(): Promise<boolean> {
  const state = await readJson<{ done?: boolean }>(ONBOARDING_FILE, {})
  return state.done === true
}

/** 标记引导完成 */
export async function markOnboardingDone(): Promise<void> {
  await writeJson(ONBOARDING_FILE, { done: true, at: new Date().toISOString() })
}
