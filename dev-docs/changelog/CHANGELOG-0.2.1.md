# CHANGELOG 0.2.1

> 日期:2026-08-04
> 自 v0.2.0 起:UI 优化 + 落地页升级与修复(patch 版)

## 🎨 UI 优化

- 液态玻璃质感 UI 优化与布局修复
- 响应式设计优化
- 配置集卡片布局与窗口尺寸优化
- 配置集卡片标题对齐、描述间距、编辑/删除按钮 title 提示

## 🌐 Landing 页(官网)

- **全屏 Hero**:首页 banner 铺满一屏,内容垂直居中
- **中英双语切换**:导航按钮循环 随系统/中文/EN,51 处文案 i18n 驱动
- **深浅主题切换**:导航按钮循环 随系统/深色/浅色,完整浅色配色,偏好 localStorage 持久化
- **动效**:hero 入场、背景光晕漂浮、滚动交错淡入、按钮呼吸光,尊重 prefers-reduced-motion
- **图标**:全部使用 lucide 风格 SVG(下载按钮/徽章/特性卡/logo),修复按钮文字对比度

## 🐛 修复

- 语言按钮切换后文字消失(LANG_LABEL 字符串索引 bug)
- 主题按钮 SVG 源码外漏(textContent 误用,改为 innerHTML 注入)
- 特性图标 / logo 补 stroke=currentColor 渲染

## 📦 应用安装包

- 含 v0.2.0 全部功能(配置集 / includeIf / 备份回滚 / SSH 密钥管理)+ 上述 UI 优化
