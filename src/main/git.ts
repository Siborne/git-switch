import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'
import type { GitConfigEntry, GitOptions, GitScope } from '../shared/types'

const execFileAsync = promisify(execFile)

const VALID_SCOPES: readonly string[] = ['system', 'global', 'local', 'worktree']

export class GitError extends Error {
  constructor(
    message: string,
    public readonly args: string[],
    public readonly exitCode: number | null,
    public readonly stderr: string
  ) {
    super(message)
    this.name = 'GitError'
  }
}

/** git 常见安装位置（Windows），按优先级排列 */
const GIT_INSTALL_CANDIDATES: string[] = [
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Programs\\Git\\cmd\\git.exe'),
  join(process.env.ProgramFiles ?? '', 'Git\\cmd\\git.exe'),
  join(process.env.ProgramW6432 ?? '', 'Git\\cmd\\git.exe'),
  'D:\\tools\\Git\\cmd\\git.exe'
]

let cachedGitPath: string | null | undefined

/**
 * 定位 git 可执行文件：
 * 1. PATH 中的 git（先执行 --version 验证）
 * 2. 常见安装路径
 * 结果缓存；返回 null 表示未找到。
 */
export async function findGit(): Promise<string | null> {
  if (cachedGitPath !== undefined) return cachedGitPath

  const candidates: string[] = ['git', ...GIT_INSTALL_CANDIDATES.filter((p) => p.length > 0 && existsSync(p))]
  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate, ['--version'], { windowsHide: true, timeout: 5000 })
      if (/git version/i.test(stdout)) {
        cachedGitPath = candidate
        return candidate
      }
    } catch {
      // 继续尝试下一个候选
    }
  }
  cachedGitPath = null
  return null
}

/**
 * 执行 git 命令（无 shell，参数数组传参，无注入风险）。
 * 失败抛出 GitError（携带退出码与 stderr）。
 */
export async function runGit(args: string[], opts: GitOptions = {}): Promise<string> {
  const git = await findGit()
  if (!git) {
    throw new GitError('未找到 git，请先安装 Git for Windows 后重试', args, null, '')
  }
  try {
    const { stdout } = await execFileAsync(git, args, {
      cwd: opts.cwd,
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 30000,
      encoding: 'utf8'
    })
    return stdout
  } catch (err) {
    const e = err as { code?: unknown; stderr?: unknown; message?: string }
    const exitCode = typeof e.code === 'number' ? e.code : null
    throw new GitError(e.message ?? 'git 命令执行失败', args, exitCode, typeof e.stderr === 'string' ? e.stderr : '')
  }
}

/**
 * 列出全部配置（含来源与 scope）。
 * 解析 `git config --list --show-origin --show-scope --null` 输出：
 * 记录以 NUL 分隔，每组 3 个字段：<scope>\0<origin>\0<key>\n<value>\0
 */
export async function listConfig(opts: GitOptions = {}): Promise<GitConfigEntry[]> {
  const out = await runGit(['config', '--list', '--show-origin', '--show-scope', '--null'], opts)
  const entries: GitConfigEntry[] = []
  const parts = out.split('\0')
  for (let i = 0; i + 2 < parts.length; i += 3) {
    const scope = parts[i]
    const origin = parts[i + 1].replace(/^file:/, '')
    const kv = parts[i + 2]
    const nl = kv.indexOf('\n')
    const key = nl >= 0 ? kv.slice(0, nl) : kv
    const value = nl >= 0 ? kv.slice(nl + 1) : ''
    entries.push({ key, value, scope, origin })
  }
  return entries
}

/** 读取单个配置项；不存在返回 null（git 退出码 1）。 */
export async function getConfig(key: string, opts: GitOptions = {}): Promise<string | null> {
  try {
    const out = await runGit(['config', '--get', key], opts)
    return out.trim()
  } catch (err) {
    if (err instanceof GitError && err.exitCode === 1) return null
    throw err
  }
}

/** 写入配置项；scope 白名单校验，local 需配合 cwd 传入仓库目录。 */
export async function setConfig(key: string, value: string, scope: GitScope = 'global', opts: GitOptions = {}): Promise<void> {
  assertScope(scope)
  await runGit(['config', `--${scope}`, key, value], opts)
}

/** 删除配置项（--unset-all 删除所有同名项）；key 不存在（exit 5）视为成功。 */
export async function unsetConfig(key: string, scope: GitScope = 'global', opts: GitOptions = {}): Promise<void> {
  assertScope(scope)
  try {
    await runGit(['config', `--${scope}`, '--unset-all', key], opts)
  } catch (err) {
    if (err instanceof GitError && err.exitCode === 5) return
    throw err
  }
}

/** 判断目录是否为 git 仓库（工作树内）。 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const out = await runGit(['rev-parse', '--is-inside-work-tree'], { cwd: dir })
    return out.trim() === 'true'
  } catch {
    return false
  }
}

/** git 版本号，如 git version 2.52.0.windows.1 */
export async function gitVersion(): Promise<string> {
  const out = await runGit(['--version'])
  return out.trim()
}

function assertScope(scope: GitScope): void {
  if (!VALID_SCOPES.includes(scope)) {
    throw new GitError(`非法的 scope: ${scope}`, [], null, '')
  }
}
