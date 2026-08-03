import type { GitSwitchApi } from '../shared/types'

declare global {
  interface Window {
    gitSwitch: GitSwitchApi
  }
}

export {}
