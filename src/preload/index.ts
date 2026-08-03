import { contextBridge } from 'electron'

const api = {
  appName: 'Git Switch',
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  }
}

export type GitSwitchApi = typeof api

contextBridge.exposeInMainWorld('gitSwitch', api)
