import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers, getCloseToTray } from './ipc'
import { runSmoke } from './smoke'
import { createTray } from './tray'

let mainWindowRef: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#0B1220',
    title: 'Git Switch',
    // 应用图标：dev 用项目源文件，打包后从 resources 读取（extraResources 拷贝）
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icon.png')
      : join(__dirname, '../../build/icon.png'),
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

  // 最大化状态同步给渲染层（标题栏图标切换）
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false)
  })

  // 关闭窗口：设置允许时最小化到系统托盘，否则直接退出
  mainWindow.on('close', (e) => {
    if (!isQuitting && getCloseToTray()) {
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

// 托盘驻留：仅当窗口真正关闭（非隐藏）时退出应用
app.on('window-all-closed', () => {
  app.quit()
})
