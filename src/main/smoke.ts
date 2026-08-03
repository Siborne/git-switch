/**
 * 冒烟测试：在临时目录完整跑一遍核心服务链路，不触碰真实用户配置。
 * 触发方式：GS_SMOKE=1 时启动应用（见 main/index.ts）。
 *
 * 链路：建配置集 → 应用到临时仓库 → 校验 local scope 生效 →
 *       改坏仓库配置 → 回滚 → 校验恢复 → 删除配置集 → 清理
 */
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { setDataDir } from './store'
import { applyProfileToRepo, createProfile, deleteProfile, listProfiles } from './profiles'
import { listBackups, restoreBackup } from './backup'
import { runGit, setConfig } from './git'

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`断言失败: ${msg}`)
  console.log(`[smoke] ok - ${msg}`)
}

async function getLocalConfig(repo: string, key: string): Promise<string | null> {
  try {
    const out = await runGit(['config', '--local', '--get', key], { cwd: repo })
    return out.trim()
  } catch {
    return null
  }
}

export async function runSmoke(): Promise<void> {
  const base = await fs.mkdtemp(join(tmpdir(), 'git-switch-smoke-'))
  const data = join(base, 'data')
  const repo = join(base, 'repo')
  await fs.mkdir(data, { recursive: true })
  await fs.mkdir(repo)
  setDataDir(data)

  try {
    // 0. 初始化临时仓库
    await runGit(['init', '-b', 'master'], { cwd: repo })
    console.log('[smoke] 临时仓库已初始化')

    // 1. 创建配置集
    const p = await createProfile({
      name: '冒烟测试用户',
      description: '自动化测试用',
      items: [
        { key: 'user.name', value: 'Smoke User' },
        { key: 'user.email', value: 'smoke@test.dev' }
      ]
    })
    assert(p.items.length === 2, '创建配置集成功')

    // 2. 应用到临时仓库（local scope + 自动备份）
    const r = await applyProfileToRepo(p.id, repo)
    assert(r.applied === 2, `应用到仓库成功（${r.applied} 项）`)

    // 3. 校验 local scope 生效
    const name = await getLocalConfig(repo, 'user.name')
    const email = await getLocalConfig(repo, 'user.email')
    assert(name === 'Smoke User', `user.name 生效: ${name}`)
    assert(email === 'smoke@test.dev', `user.email 生效: ${email}`)

    // 4. 备份点存在
    const backups = await listBackups()
    assert(backups.length >= 1, `备份点已创建（${backups.length} 个）`)

    // 5. 模拟配置被改坏
    await setConfig('user.name', 'Broken User', 'local', { cwd: repo })
    assert((await getLocalConfig(repo, 'user.name')) === 'Broken User', '模拟误改完成')

    // 6. 回滚（恢复到应用前状态：local scope 中 user.name 应被撤销，回退到全局值）
    const restored = await restoreBackup(backups[0].id)
    assert(restored.restored.length >= 1, '回滚执行完成')
    assert(restored.protection !== null, '回滚前已做保护性备份（可再次回滚）')
    let localName = ''
    try {
      localName = (await runGit(['config', '--local', '--get', 'user.name'], { cwd: repo })).trim()
    } catch {
      // key 不存在（退出码 1）
    }
    assert(localName === '', `回滚后 local user.name 已撤销（当前: "${localName}"，应为空）`)

    // 7. 删除配置集
    await deleteProfile(p.id)
    const remaining = await listProfiles()
    assert(remaining.length === 0, '配置集已删除')

    console.log('[smoke] ALL PASS')
  } finally {
    await fs.rm(base, { recursive: true, force: true })
  }
}
