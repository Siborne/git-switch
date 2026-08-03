import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { diffLines } from 'diff'
import { appendLog } from './logger'
import { dataDir, readJson, writeJson } from './storage'
import type { BackupMeta, DiffFileResult, DiffLine } from '../shared/types'

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

/** 读取备份点的文件内容（用于查看 Diff/内容）；不存在的备份文件跳过 */
export async function readBackupContent(id: string): Promise<{ file: string; content: string }[]> {
  const meta = (await readMeta()).find((m) => m.id === id)
  if (!meta) throw new Error(`备份点不存在: ${id}`)
  const out: { file: string; content: string }[] = []
  for (let i = 0; i < meta.files.length; i++) {
    const src = join(meta.backupDir, `${i}_${basename(meta.files[i])}`)
    try {
      const content = await fs.readFile(src, 'utf-8')
      out.push({ file: meta.files[i], content })
    } catch {
      // 备份文件缺失，跳过
    }
  }
  return out
}

/** 对比备份点文件与当前文件的差异（备份 = 旧版本，当前 = 新版本） */
export async function diffBackup(id: string): Promise<DiffFileResult[]> {
  const meta = (await readMeta()).find((m) => m.id === id)
  if (!meta) throw new Error(`备份点不存在: ${id}`)

  const results: DiffFileResult[] = []
  for (let i = 0; i < meta.files.length; i++) {
    const backupPath = join(meta.backupDir, `${i}_${basename(meta.files[i])}`)
    const currentPath = meta.files[i]

    let backupText: string | null = null
    let currentText: string | null = null
    try {
      backupText = await fs.readFile(backupPath, 'utf-8')
    } catch {
      // 备份文件缺失
    }
    try {
      currentText = await fs.readFile(currentPath, 'utf-8')
    } catch {
      // 当前文件不存在（已被删除）
    }

    let diff: DiffLine[] = []
    let added = 0
    let removed = 0
    if (backupText !== null || currentText !== null) {
      const parts = diffLines(backupText ?? '', currentText ?? '')
      diff = parts.map((p) => {
        const type = p.added ? 'add' : p.removed ? 'remove' : 'same'
        if (p.added) added += p.count ?? 0
        if (p.removed) removed += p.count ?? 0
        return { type, text: p.value }
      })
    }

    results.push({
      file: currentPath,
      hasBackup: backupText !== null,
      hasCurrent: currentText !== null,
      diff,
      added,
      removed
    })
  }
  return results
}
