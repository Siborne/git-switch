/**
 * 轻量中英文切换（无第三方依赖）
 * 用法：t('中文', 'English')
 */
export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'gs-lang'

let lang: Lang = (localStorage.getItem(STORAGE_KEY) as Lang) ?? 'zh'
const listeners = new Set<(l: Lang) => void>()

export function getLang(): Lang {
  return lang
}

export function setLang(l: Lang): void {
  lang = l
  localStorage.setItem(STORAGE_KEY, l)
  listeners.forEach((fn) => fn(l))
}

/** 订阅语言变化，返回取消订阅函数 */
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 双语取词：英文模式下优先英文 */
export function t(zh: string, en?: string): string {
  return lang === 'en' && en ? en : zh
}
