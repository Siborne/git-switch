/**
 * 数据存储基础设施：应用数据目录 + JSON 文件读写（原子写）。
 * 不承载任何业务语义，仅提供底层持久化能力。
 */
import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

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
