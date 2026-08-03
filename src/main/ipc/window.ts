/**
 * 窗口控制域 IPC handler（自定义标题栏）。
 * 关闭行为状态在此维护，供 main/index.ts 读取。
 */
import { BrowserWindow, ipcMain } from 'electron'

/** 关闭窗口行为：true=最小化到托盘，false=直接退出（由设置控制） */
let closeToTray = true

export function getCloseToTray(): boolean {
  return closeToTray
}

export function registerWindowHandlers(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:hide', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide()
  })
  ipcMain.on('window:setCloseBehavior', (_event, toTray: boolean) => {
    closeToTray = toTray
  })
}
