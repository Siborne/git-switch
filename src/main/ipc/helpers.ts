/**
 * IPC 注册辅助：统一包装 invoke handler，捕获异常并记录日志。
 * 错误仍原样抛给渲染层（preload 侧负责剥离 Electron 包装前缀）。
 */
import { ipcMain } from 'electron'

/** 注册一个 invoke handler，统一异常日志，避免未处理 rejection 静默丢失 */
export function safeHandle<TArgs extends unknown[]>(channel: string, fn: (...args: TArgs) => unknown): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error(`[ipc:${channel}] 调用失败:`, err)
      throw err
    }
  })
}
