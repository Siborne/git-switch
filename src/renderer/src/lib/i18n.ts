/**
 * 轻量中英文切换（无第三方依赖）
 * 语言偏好：system（跟随系统）/ zh / en，存储统一走 settings.ts
 * 用法：t('中文', 'English')
 */
import { loadSettings, saveSettings, systemLang, onSystemLangChange } from './settings'

export type LangPref = 'system' | 'zh' | 'en'

let langPref: LangPref = loadSettings().lang
const listeners = new Set<(l: LangPref) => void>()

function resolve(): 'zh' | 'en' {
  if (langPref !== 'system') return langPref
  return systemLang()
}

export function getLangPref(): LangPref {
  return langPref
}

export function setLangPref(pref: LangPref): void {
  langPref = pref
  saveSettings({ ...loadSettings(), lang: pref })
  listeners.forEach((fn) => fn(pref))
}

/** 订阅语言偏好变化（含跟随系统的解析值变化），返回取消订阅函数 */
export function onLangChange(fn: (l: LangPref) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// 跟随系统时，系统语言变化触发重渲染
onSystemLangChange(() => listeners.forEach((fn) => fn(langPref)))

/** 双语取词：英文（或跟随系统且系统为英文）时优先英文 */
export function t(zh: string, en?: string): string {
  return resolve() === 'en' && en ? en : zh
}
