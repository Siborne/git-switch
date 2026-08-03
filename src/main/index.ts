import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { runSmoke } from './smoke'
import { createTray } from './tray'

let mainWindowRef: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#070b14',
    title: 'Git Switch',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindowRef = mainWindow

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 关闭窗口时最小化到系统托盘（托盘「退出」才真正退出）
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindowRef = null
  })

  // 外部链接一律走系统浏览器，禁止在应用内新开窗口
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()

  // 冒烟测试模式：GS_SMOKE=1 时跑完整服务链路后退出，不打开窗口
  if (process.env.GS_SMOKE === '1') {
    try {
      await runSmoke()
      console.log('[smoke] PASS')
      app.exit(0)
    } catch (err) {
      console.error('[smoke] FAIL:', err)
      app.exit(1)
    }
    return
  }

  createWindow()
  createTray(() => mainWindowRef)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

// 托盘驻留：窗口全部关闭时不退出应用
app.on('window-all-closed', () => {
  // 由托盘「退出」或系统退出事件结束进程
})
