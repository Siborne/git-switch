export interface GitSwitchApi {
  appName: string
  platform: string
  versions: {
    electron: string
    node: string
    chrome: string
  }
}

declare global {
  interface Window {
    gitSwitch: GitSwitchApi
  }
}

export {}
