import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { listProfiles, applyProfileToGlobal } from './profiles'
import { getConfig } from './git'

/** 16x16 青色圆角图标（base64 PNG，内嵌避免资源路径问题） */
const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJ0lEQVR4nGNggAKly+/+k4IZ0AHZBpCqEcOgUQNGDRgmBjAMdG4EAHHks/81tasdAAAAAElFTkSuQmCC'

let tray: Tray | null = null

/** 创建系统托盘；退出动作由调用方通过 app.quit() 触发 */
export function createTray(getWindow: () => BrowserWindow | null): void {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)
  tray = new Tray(icon)
  tray.setToolTip('Git Switch — 本地 Git 配置切换')
  void rebuildTrayMenu(getWindow)
}

/** 重建托盘菜单（配置集变更 / 应用后刷新） */
export async function rebuildTrayMenu(getWindow: () => BrowserWindow | null): Promise<void> {
  if (!tray) return
  const profiles = await listProfiles()
  const [name, email] = await Promise.all([getConfig('user.name'), getConfig('user.email')])

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: `全局身份：${name?.trim() || '未设置'} <${email?.trim() || '未设置'}>`, enabled: false },
    { type: 'separator' },
    ...(profiles.length > 0
      ? profiles.map((p) => ({
          label: `应用「${p.name}」到全局`,
          click: async (): Promise<void> => {
            try {
              await applyProfileToGlobal(p.id)
              await rebuildTrayMenu(getWindow)
            } catch (err) {
              console.error('[tray] 应用配置集失败:', err)
            }
          }
        }))
      : [{ label: '（暂无配置集，打开主窗口创建）', enabled: false } as Electron.MenuItemConstructorOptions]),
    { type: 'separator' },
    {
      label: '打开主窗口',
      click: (): void => {
        const win = getWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { label: '退出', click: (): void => app.quit() }
  ]

  tray.setContextMenu(Menu.buildFromTemplate(template))
}
