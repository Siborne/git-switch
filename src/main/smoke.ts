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
import { listBackups, restoreBackup, diffBackup } from './backup'
import { runGit, setConfig, getLastCommit } from './git'
import { createIncludeRule, deleteIncludeRule, syncIncludeRules } from './includeIf'
import { exportProfiles, importProfiles } from './profiles'

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

    // 6.5 diff 链路：修改后对比备份点应检测到差异
    await setConfig('user.email', 'changed@test.dev', 'local', { cwd: repo })
    const diffRes = await diffBackup(backups[0].id)
    const repoDiff = diffRes.find((r) => r.file.endsWith(`${'config'}`))
    assert(repoDiff !== undefined, 'diff 结果包含仓库配置')
    assert(repoDiff !== undefined && (repoDiff.added > 0 || repoDiff.removed > 0), `diff 检测到变更（+${repoDiff?.added}/-${repoDiff?.removed}）`)
    await restoreBackup(backups[0].id)
    console.log('[smoke] ok - diff 链路验证通过')

    // 6.6 lastCommit 链路（-c commit.gpgsign=false 避免受用户全局签名配置影响）
    await runGit(
      ['-c', 'user.name=Smoke', '-c', 'user.email=smoke@test.dev', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'smoke commit'],
      { cwd: repo }
    )
    const lc = await getLastCommit(repo)
    assert(lc !== null && lc.subject === 'smoke commit', `lastCommit 读取成功（${lc?.hash} ${lc?.subject}）`)
    console.log('[smoke] ok - lastCommit 链路验证通过')

    // 7. 删除配置集
    await deleteProfile(p.id)
    const remaining = await listProfiles()
    assert(remaining.length === 0, '配置集已删除')

    // ============ includeIf 自动切换链路（隔离测试） ============
    const testGlobal = join(base, 'global.gitconfig')
    const testProfileDir = join(base, 'profile-files')
    await fs.mkdir(testProfileDir)
    process.env.GS_TEST_GLOBAL_CONFIG = testGlobal
    process.env.GS_TEST_PROFILE_DIR = testProfileDir

    const work = join(base, 'work')
    await fs.mkdir(work)

    // 8. 创建"工作"配置集 + 目录映射规则
    const workProfile = await createProfile({
      name: '工作身份',
      items: [
        { key: 'user.name', value: 'Work User' },
        { key: 'user.email', value: 'work@company.com' }
      ]
    })
    const rule = await createIncludeRule({ profileId: workProfile.id, path: work })
    const syncResult = await syncIncludeRules()
    assert(syncResult.applied.length === 1, `includeIf 同步成功（${syncResult.applied[0]}）`)
    assert(syncResult.conflicts.length === 0, '无冲突提示')

    // 9. 在映射目录下建仓库，验证 includeIf 自动加载身份（无 local/global 配置）
    const cfgEnv = { GIT_CONFIG_GLOBAL: testGlobal }
    await runGit(['init', '-b', 'master'], { cwd: work, env: cfgEnv })
    const autoEmail = (await runGit(['config', '--get', 'user.email'], { cwd: work, env: cfgEnv })).trim()
    assert(autoEmail === 'work@company.com', `includeIf 自动生效: ${autoEmail}`)
    const autoName = (await runGit(['config', '--get', 'user.name'], { cwd: work, env: cfgEnv })).trim()
    assert(autoName === 'Work User', `includeIf 自动生效 user.name: ${autoName}`)

    // 10. 删除规则并重新同步，验证 includeIf 失效（回到空全局）
    await deleteIncludeRule(rule.id)
    await syncIncludeRules()
    let afterRemove = ''
    try {
      afterRemove = (await runGit(['config', '--get', 'user.email'], { cwd: work, env: cfgEnv })).trim()
    } catch {
      // key 不存在
    }
    assert(afterRemove === '', `删除规则后 includeIf 失效（当前: "${afterRemove}"）`)

    // 11. 配置集独立文件已清理
    const leftover = await fs.readdir(testProfileDir).catch(() => [] as string[])
    assert(leftover.length === 0, '配置集独立文件已清理')

    // 12. 清理测试配置集
    await deleteProfile(workProfile.id)
    delete process.env.GS_TEST_GLOBAL_CONFIG
    delete process.env.GS_TEST_PROFILE_DIR

    // ============ 导入导出链路 ============
    // 13. 脱敏导出
    const expProfile = await createProfile({
      name: '导出测试',
      items: [
        { key: 'user.name', value: 'Exp User' },
        { key: 'http.proxy', value: 'http://user:pass@proxy:8080' }
      ]
    })
    const payloadSecret = await exportProfiles(false)
    const proxySecret = payloadSecret.profiles
      .find((x) => x.name === '导出测试')
      ?.items.find((i) => i.key === 'http.proxy')?.value
    assert(proxySecret === '••••', `脱敏导出生效（proxy=${proxySecret}）`)

    // 14. 明文导出
    const payloadPlain = await exportProfiles(true)
    const proxyPlain = payloadPlain.profiles
      .find((x) => x.name === '导出测试')
      ?.items.find((i) => i.key === 'http.proxy')?.value
    assert(proxyPlain?.includes('pass') === true, '明文导出包含真实值')

    // 15. 导入：新配置创建 + 同名跳过
    const importResult = await importProfiles(
      JSON.stringify({
        version: 1,
        app: 'git-switch',
        exportedAt: new Date().toISOString(),
        profiles: [
          { name: '导入的新配置', items: [{ key: 'user.name', value: 'Imported' }] },
          { name: '导出测试', items: [{ key: 'user.name', value: 'dup' }] }
        ]
      })
    )
    assert(importResult.created.length === 1 && importResult.skipped.length === 1, `导入结果：创建 ${importResult.created.length}、跳过 ${importResult.skipped.length}`)

    // 16. 非法输入报错
    let rejected = false
    try {
      await importProfiles('this is not json')
    } catch {
      rejected = true
    }
    assert(rejected, '非法 JSON 导入被拒绝')

    // 17. 清理
    await deleteProfile(expProfile.id)
    const imported = (await listProfiles()).find((p) => p.name === '导入的新配置')
    if (imported) await deleteProfile(imported.id)
    assert((await listProfiles()).length === 0, '导入导出测试清理完成')

    console.log('[smoke] ALL PASS')
  } finally {
    await fs.rm(base, { recursive: true, force: true })
  }
}
