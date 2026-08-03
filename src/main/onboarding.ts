/**
 * 首次启动引导（onboarding）状态。
 */
import { readJson, writeJson } from './storage'

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
