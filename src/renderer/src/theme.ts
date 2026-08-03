import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

/**
 * Git Switch 设计系统（v2）——Developer Tool / Premium Dark
 *
 * 色板（低饱和、柔和蓝、少量 Cyan 点缀）：
 *   Background #0B1220 / Sidebar #121826 / Card #1A2234
 *   Primary #3B82F6 / Accent #06B6D4
 *   Success #22C55E / Warning #F59E0B / Danger #EF4444
 *
 * 圆角：页面 16 / Card 18-20 / Input·Button 12 / Tag 999
 * 边框：1px rgba(255,255,255,.06)；阴影：soft（0 8px 30px rgba(0,0,0,.25)）
 */
export const antdThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 色板
    colorPrimary: '#3B82F6',
    colorInfo: '#3B82F6',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorLink: '#3B82F6',
    // 层次：Background → Container → Card → Content
    colorBgBase: '#0B1220',
    colorBgLayout: '#0B1220',
    colorBgContainer: '#1A2234',
    colorBgElevated: '#1E2A44',
    colorBgSpotlight: 'rgba(11, 18, 32, 0.92)',
    colorFillAlter: 'rgba(255, 255, 255, 0.04)',
    colorFillSecondary: 'rgba(255, 255, 255, 0.06)',
    colorFillTertiary: 'rgba(255, 255, 255, 0.02)',
    // 边框：1px 低透明度
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
    // 文字层级
    colorText: 'rgba(255, 255, 255, 0.88)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.6)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.38)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.22)',
    // 圆角：Input/Button 12 / Card 18~20 / Modal 20
    borderRadius: 12,
    borderRadiusLG: 20,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    // 字体
    fontFamily: "'Inter', 'Segoe UI Variable', 'MiSans', 'HarmonyOS Sans', 'Microsoft YaHei', system-ui, sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    // 柔和阴影
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
    boxShadowSecondary: '0 12px 40px rgba(0, 0, 0, 0.32)',
    // 统一控件高度（8pt grid：32 / 36 / 40）
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,
    // 动效：150ms 基准
    motionDurationMid: '0.15s',
    motionDurationSlow: '0.2s'
  },
  components: {
    Layout: {
      siderBg: '#121826',
      bodyBg: '#0B1220',
      headerBg: 'transparent',
      headerHeight: 72,
      headerPadding: '0 32px'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemColor: 'rgba(255, 255, 255, 0.62)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      darkItemHoverColor: 'rgba(255, 255, 255, 0.9)',
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.14)',
      darkItemSelectedColor: '#fff',
      itemBorderRadius: 10,
      itemMarginInline: 12,
      itemHeight: 40,
      iconSize: 20
    },
    Card: {
      colorBgContainer: '#1A2234',
      borderRadiusLG: 18,
      paddingLG: 24,
      headerFontSize: 15
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: 'rgba(255, 255, 255, 0.04)',
      headerColor: 'rgba(255, 255, 255, 0.5)',
      headerSplitColor: 'transparent',
      rowHoverBg: 'rgba(255, 255, 255, 0.045)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      cellPaddingBlock: 13,
      cellPaddingInline: 16
    },
    Button: {
      borderRadius: 12,
      fontWeight: 500,
      primaryShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
    },
    Input: {
      borderRadius: 12,
      activeShadow: '0 0 0 3px rgba(59, 130, 246, 0.18)'
    },
    Select: {
      borderRadius: 12
    },
    Modal: {
      borderRadiusLG: 20
    },
    Tag: {
      borderRadiusSM: 999
    },
    Tooltip: {
      colorBgSpotlight: 'rgba(30, 42, 68, 0.95)'
    },
    Tabs: {
      inkBarColor: '#3B82F6',
      itemSelectedColor: '#fff',
      itemColor: 'rgba(255, 255, 255, 0.55)'
    },
    Steps: {
      colorPrimary: '#3B82F6'
    },
    Timeline: {
      tailColor: 'rgba(255, 255, 255, 0.08)'
    }
  }
}

/** 浅色主题 */
export const lightThemeConfig: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#2563EB',
    colorInfo: '#2563EB',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorLink: '#2563EB',
    colorBgBase: '#F4F6FB',
    colorBgLayout: '#F4F6FB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorFillAlter: 'rgba(15, 23, 42, 0.03)',
    colorFillSecondary: 'rgba(15, 23, 42, 0.05)',
    colorBorder: 'rgba(15, 23, 42, 0.1)',
    colorBorderSecondary: 'rgba(15, 23, 42, 0.08)',
    colorText: 'rgba(15, 23, 42, 0.88)',
    colorTextSecondary: 'rgba(15, 23, 42, 0.62)',
    colorTextTertiary: 'rgba(15, 23, 42, 0.42)',
    borderRadius: 12,
    borderRadiusLG: 20,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    fontFamily: "'Inter', 'Segoe UI Variable', 'MiSans', 'HarmonyOS Sans', 'Microsoft YaHei', system-ui, sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
    boxShadowSecondary: '0 12px 40px rgba(15, 23, 42, 0.12)',
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,
    motionDurationMid: '0.15s',
    motionDurationSlow: '0.2s'
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
      bodyBg: '#F4F6FB',
      headerBg: 'transparent',
      headerHeight: 72,
      headerPadding: '0 32px'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemColor: 'rgba(15, 23, 42, 0.6)',
      darkItemHoverBg: 'rgba(15, 23, 42, 0.04)',
      darkItemHoverColor: 'rgba(15, 23, 42, 0.9)',
      darkItemSelectedBg: 'rgba(37, 99, 235, 0.1)',
      darkItemSelectedColor: '#1D4ED8',
      itemBorderRadius: 10,
      itemMarginInline: 12,
      itemHeight: 40,
      iconSize: 20
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      borderRadiusLG: 18,
      paddingLG: 24,
      headerFontSize: 15
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: 'rgba(15, 23, 42, 0.03)',
      headerColor: 'rgba(15, 23, 42, 0.5)',
      headerSplitColor: 'transparent',
      rowHoverBg: 'rgba(37, 99, 235, 0.05)',
      borderColor: 'rgba(15, 23, 42, 0.08)',
      cellPaddingBlock: 13,
      cellPaddingInline: 16
    },
    Button: {
      borderRadius: 12,
      fontWeight: 500,
      primaryShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
    },
    Input: {
      borderRadius: 12,
      activeShadow: '0 0 0 3px rgba(37, 99, 235, 0.15)'
    },
    Select: {
      borderRadius: 12
    },
    Modal: {
      borderRadiusLG: 20
    },
    Tag: {
      borderRadiusSM: 999
    },
    Tooltip: {
      colorBgSpotlight: 'rgba(255, 255, 255, 0.97)'
    },
    Tabs: {
      inkBarColor: '#2563EB',
      itemSelectedColor: '#1D4ED8',
      itemColor: 'rgba(15, 23, 42, 0.55)'
    },
    Steps: {
      colorPrimary: '#2563EB'
    },
    Timeline: {
      tailColor: 'rgba(15, 23, 42, 0.08)'
    }
  }
}

/** 深色主题（默认）别名 */
export const darkThemeConfig: ThemeConfig = antdThemeConfig
