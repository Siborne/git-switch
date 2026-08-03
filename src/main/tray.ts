import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { listProfiles, applyProfileToGlobal } from './profiles'
import { getConfig } from './git'

/** 16x16 品牌托盘图标（透明底：青蓝渐变菱形 + 切换箭头，base64 内嵌避免资源路径问题） */
const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABeElEQVR4nGNgoCmo/08ExmRrhgFSDbGv/88CouOWvPWMXfrWC1mMsOb9EIUxy147GU37+NNw6sdf8ctfOyPLIQMmdJsPOjL+SVn72un6N/ZN3///Yf3O8Jv58jf29QlrXzuB5NBdwojiz0bGf3FrnjseeM22+eMfZm5J1u8P2ZkZ2F8yiUjw/v30z1z4l+uSYMl9MLUIA+ohAmGbX3mdec28JlWLjUNLiJnhw49/T+5++H1YhpeF9cwbBskDz/8Za/P9DF0fILYVpocF2Tn/GRkY/7D8Y/zP+v//f5b/jP9Z/jP8Y2X4/4/l3/8/zP//g+UYkVyNzQsRWx877X7DDPIClyzLj4eszIxsL1iEJHn/fP5nLvDLfZ2P/B5kL6AA+/r9YBdF7nirLTm+VeJZY/+iS99+Fdx7fPP4bueOCOrwQnsoVHlv+2Bs9SaR7+k1jz67bf9oQuyHEFgvx9ii8vex15uOx74IIsRDyhJynDw/z8TGNMSAACiM7wmzDfE2gAAAABJRU5ErkJggg=='

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
