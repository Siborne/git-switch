/**
 * onboarding 域 IPC handler。
 */
import { safeHandle } from './helpers'
import { isOnboardingDone, markOnboardingDone } from '../onboarding'

export function registerOnboardingHandlers(): void {
  safeHandle('onboarding:status', () => isOnboardingDone())
  safeHandle('onboarding:markDone', () => markOnboardingDone())
}
