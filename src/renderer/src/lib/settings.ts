/** 应用设置：localStorage 持久化，全部跟随系统为默认 */

export type ThemePref = 'system' | 'dark' | 'light'
export type LangPref = 'system' | 'zh' | 'en'

export interface AppSettings {
  /** 主题偏好（默认跟随系统） */
  theme: ThemePref
  /** 语言偏好（默认跟随系统） */
  lang: LangPref
  /** 关闭窗口行为：true=最小化到托盘（默认），false=直接退出 */
  closeToTray: boolean
}

const STORAGE_KEY = 'gs-settings'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  lang: 'system',
  closeToTray: true
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : DEFAULT_SETTINGS.theme,
      lang: parsed.lang === 'zh' || parsed.lang === 'en' ? parsed.lang : DEFAULT_SETTINGS.lang,
      closeToTray: typeof parsed.closeToTray === 'boolean' ? parsed.closeToTray : DEFAULT_SETTINGS.closeToTray
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/** 解析系统主题偏好 */
export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 解析系统语言（zh 系 → 中文，其余 → English） */
export function systemLang(): 'zh' | 'en' {
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 监听系统主题变化，返回取消订阅 */
export function onSystemThemeChange(cb: (dark: boolean) => void): () => void {
  const m = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent): void => cb(e.matches)
  m.addEventListener('change', handler)
  return () => m.removeEventListener('change', handler)
}

/** 监听系统语言变化，返回取消订阅 */
export function onSystemLangChange(cb: () => void): () => void {
  window.addEventListener('languagechange', cb)
  return () => window.removeEventListener('languagechange', cb)
}
