/**
 * SSH 密钥服务：检测 ssh-keygen、生成密钥对落盘、读取公钥、读写 ~/.ssh/config。
 * 全部命令走无 shell 参数数组（防注入）；目标文件已存在时拒绝覆盖。
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { appendLog } from './logger'
import type { SshKeyStatus, SshKeyType } from '../shared/types'

const execFileAsync = promisify(execFile)

/** Host 白名单：字母数字 + . * ? _ -（排除空格/换行/路径分隔符，防 config 注入） */
const HOST_RE = /^[a-zA-Z0-9.*?_-]+$/
/** 用户名白名单（git / root 等） */
const USER_RE = /^[a-zA-Z0-9._-]+$/
/** 密钥文件名白名单（纯文件名，禁路径分隔符，防写出 ~/.ssh） */
const FILE_NAME_RE = /^[a-zA-Z0-9._-]+$/

/** 测试隔离：GS_TEST_SSH_DIR 重定向 ~/.ssh（冒烟测试据此不触碰真实用户密钥） */
function sshDirOverride(): string | undefined {
  return process.env.GS_TEST_SSH_DIR
}

/** SSH 密钥目录（默认 %USERPROFILE%\.ssh） */
export function sshDir(): string {
  return sshDirOverride() ?? join(process.env.USERPROFILE ?? '', '.ssh')
}

/** ~/.ssh/config 路径 */
export function sshConfigPath(): string {
  return join(sshDir(), 'config')
}

/**
 * 定位 ssh-keygen 可执行文件：
 * 1. Windows 内置 OpenSSH：%SystemRoot%\System32\OpenSSH\ssh-keygen.exe（存在即可用）
 * 2. PATH 中的 ssh-keygen（执行 -h 探测；Windows OpenSSH 以非 0 退出码打印 usage，
 *    因此只要进程有输出即视为可用）
 * 返回 null 表示不可用（需启用 Windows OpenSSH 可选功能）。
 */
export async function detectSshKeygen(): Promise<string | null> {
  const candidates = [
    join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'OpenSSH', 'ssh-keygen.exe'),
    'ssh-keygen'
  ]
  for (const candidate of candidates) {
    if (candidate.includes('\\') && existsSync(candidate)) return candidate
    try {
      const { stdout, stderr } = await execFileAsync(candidate, ['-h'], { windowsHide: true, timeout: 5000 })
      if (stdout || stderr) return candidate
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string }
      if (e.stdout || e.stderr) return candidate
    }
  }
  return null
}

/** 默认公钥注释：user@host */
function defaultComment(): string {
  return `${process.env.USERNAME ?? 'user'}@${process.env.COMPUTERNAME ?? 'host'}`
}

export interface SshGenerateOptions {
  type: SshKeyType
  comment?: string
  /** 私钥文件名（不带扩展名），默认 id_ed25519 / id_rsa */
  fileName?: string
}

/**
 * 生成密钥对并落盘：
 * - 目标私钥或 .pub 已存在 → 抛错拒绝（防覆盖）；
 * - 无密码短语（-N ""），Windows 权限由 ssh-keygen 设置。
 */
export async function generateKeyPair(opts: SshGenerateOptions): Promise<{ privatePath: string; publicPath: string; publicKey: string }> {
  const keygen = await detectSshKeygen()
  if (!keygen) {
    throw new Error('未找到 ssh-keygen，请先启用 Windows OpenSSH 客户端（设置 → 应用 → 可选功能 → OpenSSH 客户端）')
  }
  const dir = sshDir()
  await fs.mkdir(dir, { recursive: true })

  const fileName = opts.fileName?.trim() || (opts.type === 'rsa' ? 'id_rsa' : 'id_ed25519')
  if (!FILE_NAME_RE.test(fileName)) {
    throw new Error(`非法的密钥文件名: ${fileName}（仅允许字母/数字/./_/-）`)
  }
  const privatePath = join(dir, fileName)
  const publicPath = `${privatePath}.pub`
  if (existsSync(privatePath) || existsSync(publicPath)) {
    throw new Error(`密钥已存在: ${privatePath}（为避免覆盖已有密钥，请更换文件名或使用现有密钥）`)
  }

  const args = ['-t', opts.type]
  if (opts.type === 'rsa') args.push('-b', '4096')
  args.push('-C', opts.comment?.trim() || defaultComment(), '-f', privatePath, '-N', '')

  await execFileAsync(keygen, args, { windowsHide: true, timeout: 30000 })
  const publicKey = (await fs.readFile(publicPath, 'utf-8')).trim()
  await appendLog('ssh-generate', { type: opts.type, path: privatePath })
  return { privatePath, publicPath, publicKey }
}

/** 列出 ~/.ssh 下已有的密钥对（*.pub 且私钥存在） */
export async function listKeyStatus(): Promise<SshKeyStatus[]> {
  const dir = sshDir()
  let entries: { name: string; isFile: boolean }[]
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })).map((e) => ({ name: e.name, isFile: e.isFile() }))
  } catch {
    return []
  }
  const pubFiles = entries.filter((e) => e.isFile && e.name.endsWith('.pub')).map((e) => e.name)
  const out: SshKeyStatus[] = []
  for (const pub of pubFiles) {
    const privateName = pub.slice(0, -4)
    if (!entries.some((e) => e.isFile && e.name === privateName)) continue
    const publicPath = join(dir, pub)
    const content = (await fs.readFile(publicPath, 'utf-8').catch(() => '')).trim()
    const parts = content.split(/\s+/)
    const type: SshKeyStatus['type'] =
      parts[0] === 'ssh-ed25519' ? 'ed25519' : parts[0] === 'ssh-rsa' ? 'rsa' : 'unknown'
    out.push({
      fileName: privateName,
      privatePath: join(dir, privateName),
      publicPath,
      type,
      fingerprint: parts[1] ?? undefined,
      publicKey: content || undefined,
      comment: parts[2] ?? undefined
    })
  }
  return out
}

/* ---------- ~/.ssh/config 读写 ---------- */

/** 读取 ~/.ssh/config 全文（不存在返回空串） */
export async function readSshConfig(): Promise<string> {
  try {
    return await fs.readFile(sshConfigPath(), 'utf-8')
  } catch {
    return ''
  }
}

interface HostBlock {
  start: number
  end: number
  hosts: string[]
}

/** 解析 config 中的 Host 块（Host 行到下一个 Host 行之间）；关键字大小写不敏感 */
function parseHostBlocks(lines: string[]): HostBlock[] {
  const blocks: HostBlock[] = []
  let i = 0
  while (i < lines.length) {
    const m = /^\s*[Hh][Oo][Ss][Tt]\s+(.+?)\s*$/.exec(lines[i])
    if (m) {
      const start = i
      const hosts = m[1].split(/\s+/).filter(Boolean)
      i++
      while (i < lines.length && !/^\s*[Hh][Oo][Ss][Tt]\s+/.test(lines[i])) i++
      blocks.push({ start, end: i - 1, hosts })
    } else {
      i++
    }
  }
  return blocks
}

/** 块内更新/新增/删除一个选项行（如 IdentityFile）；value 为 undefined 时删除该选项 */
function applyOption(blockLines: string[], key: string, value?: string): string[] {
  const re = new RegExp(`^\\s*${key}(?:\\s+|$)`)
  const idx = blockLines.findIndex((l) => re.test(l))
  if (idx >= 0) {
    if (value === undefined) {
      blockLines.splice(idx, 1)
    } else {
      blockLines[idx] = `    ${key} ${value}`
    }
  } else if (value !== undefined) {
    blockLines.push(`    ${key} ${value}`)
  }
  return blockLines
}

/** 将更新后的行数组原子写回 config（保留原行尾风格） */
async function persistConfig(lines: string[]): Promise<string> {
  const dir = sshDir()
  await fs.mkdir(dir, { recursive: true })
  const path = sshConfigPath()
  const prev = await readSshConfig()
  const eol = prev.includes('\r\n') ? '\r\n' : '\n'
  const text = lines.join(eol)
  const tmp = `${path}.tmp`
  await fs.writeFile(tmp, text, 'utf-8')
  await fs.rename(tmp, path)
  return text
}

/**
 * 幂等写入/更新指定 Host 块：
 * - 已存在同 Host 块 → 更新/补充 User、IdentityFile、IdentitiesOnly 行，保留其余行与注释；
 * - 不存在 → 在文件末尾追加新块。
 * 返回写入后的 config 全文。
 */
export async function writeSshConfigHost(
  host: string,
  opts: { user?: string; identityFile?: string } = {}
): Promise<string> {
  const hostKey = host.trim()
  if (!HOST_RE.test(hostKey)) {
    throw new Error('Host 非法：仅允许字母/数字/./*/?/_/-（如 github.com、*.example.com）')
  }
  if (opts.user !== undefined && opts.user.trim().length > 0 && !USER_RE.test(opts.user.trim())) {
    throw new Error('User 非法：仅允许字母/数字/./_/-')
  }

  const raw = await readSshConfig()
  const lines = raw.length > 0 ? raw.split(/\r?\n/) : []
  const blocks = parseHostBlocks(lines)
  const block = blocks.find((b) => b.hosts.some((h) => h.toLowerCase() === hostKey.toLowerCase()))

  if (block) {
    const blockLines = lines.slice(block.start, block.end + 1)
    // 追加缺失的固定选项
    if (blockLines.findIndex((l) => /^\s*HostName\s+/.test(l)) < 0) blockLines.push(`    HostName ${hostKey}`)
    applyOption(blockLines, 'User', opts.user?.trim() || undefined)
    applyOption(blockLines, 'IdentityFile', opts.identityFile)
    if (blockLines.findIndex((l) => /^\s*IdentitiesOnly\s+/.test(l)) < 0) blockLines.push('    IdentitiesOnly yes')
    const updated = [...lines.slice(0, block.start), ...blockLines, ...lines.slice(block.end + 1)]
    const text = await persistConfig(updated)
    await appendLog('ssh-config-write', { host: hostKey })
    return text
  }

  const newBlock = [`Host ${hostKey}`, `    HostName ${hostKey}`]
  if (opts.user?.trim()) newBlock.push(`    User ${opts.user.trim()}`)
  if (opts.identityFile) newBlock.push(`    IdentityFile ${opts.identityFile}`)
  newBlock.push('    IdentitiesOnly yes')
  const out = raw.trim().length > 0 ? [...lines, '', ...newBlock] : newBlock
  const text = await persistConfig(out)
  await appendLog('ssh-config-write', { host: hostKey })
  return text
}

/** 删除指定 Host 块（撤销配置），返回删除后的 config 全文 */
export async function removeSshConfigHost(host: string): Promise<string> {
  const hostKey = host.trim()
  if (!HOST_RE.test(hostKey)) {
    throw new Error('Host 非法：仅允许字母/数字/./*/?/_/-')
  }
  const raw = await readSshConfig()
  const lines = raw.length > 0 ? raw.split(/\r?\n/) : []
  const blocks = parseHostBlocks(lines)
  const block = blocks.find((b) => b.hosts.some((h) => h.toLowerCase() === hostKey.toLowerCase()))
  if (!block) return raw
  const updated = [...lines.slice(0, block.start), ...lines.slice(block.end + 1)]
  const text = await persistConfig(updated)
  await appendLog('ssh-config-remove', { host: hostKey })
  return text
}

/**
 * 修改已有密钥的备注（comment）：
 * `ssh-keygen -c -C <comment> -f <key>` 同时更新私钥内嵌注释并重新生成 .pub。
 * 修改前自动备份原私钥到 <private>.bak-<ts>，全程可回滚。
 */
export async function changeKeyComment(
  privatePath: string,
  comment: string
): Promise<{ publicKey: string; comment: string; backupPath: string }> {
  const keygen = await detectSshKeygen()
  if (!keygen) {
    throw new Error('未找到 ssh-keygen，请先启用 Windows OpenSSH 客户端（设置 → 应用 → 可选功能 → OpenSSH 客户端）')
  }
  // 路径约束：仅允许操作 ~/.ssh 下的密钥（防任意路径写）
  if (dirname(privatePath) !== sshDir()) {
    throw new Error('非法密钥路径：仅允许操作 ~/.ssh 下的密钥')
  }
  if (!existsSync(privatePath)) {
    throw new Error(`私钥不存在: ${privatePath}`)
  }
  const newComment = comment.trim()
  if (!newComment) throw new Error('备注不能为空')
  if (newComment.length > 200) throw new Error('备注过长（最多 200 字符）')

  // 修改前备份（.bak-<ts> 保留在同目录，可手动删除）
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `${privatePath}.bak-${ts}`
  await fs.copyFile(privatePath, backupPath)

  await execFileAsync(keygen, ['-c', '-C', newComment, '-f', privatePath], { windowsHide: true, timeout: 30000 })
  const publicKey = (await fs.readFile(`${privatePath}.pub`, 'utf-8')).trim()
  await appendLog('ssh-comment-change', { path: privatePath, backup: backupPath })
  return { publicKey, comment: newComment, backupPath }
}
