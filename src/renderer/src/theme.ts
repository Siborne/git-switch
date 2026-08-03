import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

/**
 * 深色玻璃拟态（Glassmorphism）主题：
 * - 默认深色（darkAlgorithm）
 * - 强调色为青→紫科技感渐变（青色为主色）
 * - 容器半透明，配合 global.css 中的 backdrop-filter 实现毛玻璃
 */
export const antdThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#22d3ee',
    colorInfo: '#22d3ee',
    colorBgBase: '#0a0f1e',
    colorBgContainer: 'rgba(255, 255, 255, 0.06)',
    colorBgElevated: 'rgba(20, 28, 48, 0.92)',
    colorBorder: 'rgba(255, 255, 255, 0.12)',
    colorText: 'rgba(235, 242, 255, 0.92)',
    colorTextSecondary: 'rgba(235, 242, 255, 0.62)',
    borderRadius: 10,
    fontFamily: "'Segoe UI', 'Microsoft YaHei', system-ui, -apple-system, sans-serif"
  },
  components: {
    Layout: {
      siderBg: 'transparent',
      bodyBg: 'transparent',
      headerBg: 'transparent'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(34, 211, 238, 0.16)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)'
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.05)'
    }
  }
}
