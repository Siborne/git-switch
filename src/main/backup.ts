import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { appendLog, dataDir, readJson, writeJson } from './store'

export interface BackupMeta {
  /** 备份点 id（时间戳） */
  id: string
  /** ISO 时间 */
  createdAt: string
  /** 触发备份的操作说明 */
  reason: string
  /** 被备份的原始文件路径（与备份文件按索引对应） */
  files: string[]
  /** 备份文件所在目录 */
  backupDir: string
}

const META_FILE = 'backups.json'

function backupRoot(): string {
  return join(dataDir(), 'backup')
}

async function readMeta(): Promise<BackupMeta[]> {
  return readJson<BackupMeta[]>(META_FILE, [])
}

async function writeMeta(meta: BackupMeta[]): Promise<void> {
  await writeJson(META_FILE, meta)
}

/**
 * 备份一批配置文件到 backup/<timestamp>/。
 * 不存在的源文件自动跳过（如首次应用时全局配置尚未创建）。
 * 返回 null 表示没有任何文件被实际备份。
 */
export async function createBackup(filePaths: string[], reason: string): Promise<BackupMeta | null> {
  if (filePaths.length === 0) return null
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = join(backupRoot(), id)
  await fs.mkdir(backupDir, { recursive: true })

  const saved: string[] = []
  for (let i = 0; i < filePaths.length; i++) {
    const src = filePaths[i]
    try {
      const stat = await fs.stat(src)
      if (!stat.isFile()) continue
      await fs.copyFile(src, join(backupDir, `${i}_${basename(src)}`))
      saved.push(src)
    } catch {
      // 源文件不存在或无权限：跳过
    }
  }
  if (saved.length === 0) return null

  const meta: BackupMeta = { id, createdAt: new Date().toISOString(), reason, files: saved, backupDir }
  const all = await readMeta()
  all.unshift(meta)
  await writeMeta(all)
  return meta
}

/** 备份点列表（新→旧） */
export async function listBackups(): Promise<BackupMeta[]> {
  return readMeta()
}

/**
 * 回滚到指定备份点。
 * 回滚前先对当前文件做一次保护性备份，保证可以再回滚。
 */
export async function restoreBackup(id: string): Promise<{ restored: string[]; protection: BackupMeta | null }> {
  const meta = (await readMeta()).find((m) => m.id === id)
  if (!meta) throw new Error(`备份点不存在: ${id}`)

  // 保护性备份当前状态（如文件已不存在则跳过）
  const protection = await createBackup(meta.files, `回滚前保护（目标备份点 ${id}）`)

  const restored: string[] = []
  for (let i = 0; i < meta.files.length; i++) {
    const dest = meta.files[i]
    const src = join(meta.backupDir, `${i}_${basename(dest)}`)
    try {
      await fs.copyFile(src, dest)
      restored.push(dest)
    } catch (err) {
      throw new Error(`回滚 ${dest} 失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  await appendLog('restore', { backupId: id, restored })
  return { restored, protection }
}
