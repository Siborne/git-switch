/**
 * 应用级路径与环境配置（唯一来源）。
 * 统一管理全局 gitconfig 路径、配置集独立文件目录与测试隔离环境变量，
 * 供 profiles / includeIf 等业务模块复用，避免路径逻辑散落各处。
 */
import { join } from 'path'

/** 测试隔离：GS_TEST_GLOBAL_CONFIG 重定向全局配置（冒烟测试据此不触碰真实用户配置） */
function testGlobalConfig(): string | undefined {
  return process.env.GS_TEST_GLOBAL_CONFIG
}

/** 测试隔离：GS_TEST_PROFILE_DIR 重定向配置集独立文件目录 */
function testProfileDir(): string {
  return process.env.GS_TEST_PROFILE_DIR ?? process.env.USERPROFILE ?? ''
}

/** 全局配置文件路径（%USERPROFILE%\.gitconfig，测试时被 GS_TEST_GLOBAL_CONFIG 重定向） */
export function globalConfigFile(): string {
  return testGlobalConfig() ?? join(process.env.USERPROFILE ?? '', '.gitconfig')
}

/** 配置集独立文件所在目录 */
export function profileConfigDir(): string {
  return testProfileDir()
}

/** 配置集独立配置文件：~/.gitconfig-<profileId> */
export function profileConfigFile(profileId: string): string {
  return join(profileConfigDir(), `.gitconfig-${profileId}`)
}

/** 附加给 git 命令的环境变量（测试时重定向 GIT_CONFIG_GLOBAL 以隔离全局配置） */
export function gitEnv(): Record<string, string> | undefined {
  const g = testGlobalConfig()
  return g ? { GIT_CONFIG_GLOBAL: g } : undefined
}
