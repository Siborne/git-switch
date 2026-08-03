/**
 * 操作日志：追加式写盘（append 模式天然防并发丢行），读取时新→旧。
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import { dataDir, ensureDataDir } from './storage'
import type { LogEntry } from '../shared/types'

const LOG_FILE = 'operations.log'

/** 追加一条操作日志 */
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
