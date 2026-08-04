import { useEffect, useState } from 'react'
import { Button, ConfigProvider, Layout, Menu, Radio, Select, Typography, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import {
  GitBranch,
  IdCard,
  FolderGit2,
  Layers,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  LayoutDashboard,
  Settings as SettingsIcon,
  KeyRound,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { darkThemeConfig, lightThemeConfig } from './theme'
import ProfilesPage from './pages/Profiles'
import ProjectsPage from './pages/Projects'
import EffectiveViewPage from './pages/EffectiveView'
import ConfigBrowserPage from './pages/ConfigBrowser'
import BackupsPage from './pages/Backups'
import IncludeIfPage from './pages/IncludeIf'
import SshKeysPage from './pages/SshKeys'
import DashboardPage from './pages/Dashboard'
import SettingsPage from './pages/Settings'
import OnboardingModal from './components/OnboardingModal'
import TitleBar from './components/TitleBar'
import GitHubIcon from './components/GitHubIcon'
import { getLangPref, onLangChange, setLangPref, t } from './lib/i18n'
import { loadSettings, saveSettings, systemPrefersDark, onSystemThemeChange, systemLang } from './lib/settings'
import type { ThemePref } from './lib/settings'
import type { LangPref } from './lib/i18n'
import type { Profile } from '../../shared/types'

const { Sider, Content } = Layout

const menuKeys = ['dashboard', 'profiles', 'projects', 'effective', 'include', 'ssh', 'browser', 'backups', 'settings'] as const

const pageLabels: Record<(typeof menuKeys)[number], [string, string]> = {
  dashboard: ['概览', 'Overview'],
  profiles: ['配置集', 'Profiles'],
  projects: ['项目配置', 'Projects'],
  effective: ['生效值', 'Effective'],
  include: ['自动切换', 'Auto Switch'],
  ssh: ['SSH 密钥', 'SSH Keys'],
  browser: ['配置浏览器', 'Config Browser'],
  backups: ['备份与回滚', 'Backups'],
  settings: ['设置', 'Settings']
}

const menuIcons: Record<(typeof menuKeys)[number], React.ReactNode> = {
  dashboard: <LayoutDashboard size={20} />,
  profiles: <IdCard size={20} />,
  projects: <FolderGit2 size={20} />,
  effective: <Layers size={20} />,
  include: <ArrowLeftRight size={20} />,
  ssh: <KeyRound size={20} />,
  browser: <SlidersHorizontal size={20} />,
  backups: <History size={20} />,
  settings: <SettingsIcon size={20} />
}

const pages: Record<string, React.ReactNode> = {
  dashboard: <DashboardPage />,
  profiles: <ProfilesPage />,
  projects: <ProjectsPage />,
  effective: <EffectiveViewPage />,
  include: <IncludeIfPage />,
  ssh: <SshKeysPage />,
  browser: <ConfigBrowserPage />,
  backups: <BackupsPage />
}

const THEME_ICON: Record<ThemePref, React.ReactNode> = {
  system: <Monitor size={15} />,
  dark: <Moon size={15} />,
  light: <Sun size={15} />
}

export default function App(): React.JSX.Element {
  const [active, setActive] = useState('dashboard')
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [versions, setVersions] = useState<{ electron: string; node: string; chrome: string } | null>(null)
  const [gitVersion, setGitVersion] = useState<string | null>(null)
  const [quickProfiles, setQuickProfiles] = useState<Profile[]>([])
  const [quickApplying, setQuickApplying] = useState(false)
  const [themePref, setThemePref] = useState<ThemePref>(() => loadSettings().theme)
  const [closeToTray, setCloseToTray] = useState<boolean>(() => loadSettings().closeToTray)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)
  const [langPref, setLangPrefState] = useState<LangPref>(getLangPref)
  const [messageApi, contextHolder] = message.useMessage()

  // 跟随系统：监听系统主题变化
  useEffect(() => onSystemThemeChange(setSystemDark), [])

  // 语言状态同步（含跟随系统的解析值变化）
  useEffect(() => onLangChange(setLangPrefState), [])

  // 解析最终主题并应用到 document
  const effectiveTheme: 'dark' | 'light' = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref
  const resolvedLang: 'zh' | 'en' = langPref === 'system' ? systemLang() : langPref
  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
  }, [effectiveTheme])

  // 初始同步关闭行为到主进程
  useEffect(() => {
    window.gitSwitch.windowControls.setCloseBehavior(loadSettings().closeToTray)
  }, [])

  const handleThemeChange = (v: ThemePref): void => {
    setThemePref(v)
    saveSettings({ ...loadSettings(), theme: v })
  }

  const handleLangChange = (v: LangPref): void => {
    setLangPref(v)
  }

  const handleCloseBehaviorChange = (v: boolean): void => {
    setCloseToTray(v)
    saveSettings({ ...loadSettings(), closeToTray: v })
    window.gitSwitch.windowControls.setCloseBehavior(v)
  }

  const menuItems = menuKeys.map((key) => ({ key, icon: menuIcons[key], label: t(pageLabels[key][0], pageLabels[key][1]) }))

  useEffect(() => {
    setVersions(window.gitSwitch.versions)
    void window.gitSwitch.git.version().then(setGitVersion).catch(() => undefined)
    void window.gitSwitch.onboarding.status().then((done) => {
      if (!done) setOnboardingOpen(true)
    })
    void window.gitSwitch.profiles.list().then(setQuickProfiles)
  }, [])

  // 键盘导航：Ctrl/Cmd + 1~8 切换页面
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= String(menuKeys.length)) {
        const item = menuKeys[Number(e.key) - 1]
        if (item) {
          e.preventDefault()
          setActive(item)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const cycleTheme = (): void => {
    const order: ThemePref[] = ['system', 'dark', 'light']
    const next = order[(order.indexOf(themePref) + 1) % order.length]
    setThemePref(next)
    saveSettings({ ...loadSettings(), theme: next })
  }

  const quickApply = async (id: string): Promise<void> => {
    const p = quickProfiles.find((x) => x.id === id)
    if (!p) return
    setQuickApplying(true)
    try {
      const r = await window.gitSwitch.profiles.applyGlobal(id)
      messageApi.success(`「${p.name}」已应用到全局（${r.applied} 项${r.backedUp ? '，原配置已备份' : ''}）`)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setQuickApplying(false)
    }
  }

  return (
    <ConfigProvider locale={resolvedLang === 'zh' ? zhCN : enUS} theme={effectiveTheme === 'dark' ? darkThemeConfig : lightThemeConfig}>
      <div className="app-shell">
        <TitleBar />
        <Layout className="app-body">
          <Sider width={228} theme="dark" className="sider">
            <div className="sider-inner">
              <a className="logo" onClick={() => setActive('dashboard')}>
                <span className="logo-badge">
                  <GitBranch size={20} />
                </span>
                <span>
                  <div className="logo-name gradient-text">Git Switch</div>
                  <div className="logo-sub">Identity Manager</div>
                </span>
              </a>
              <Menu
                theme="dark"
                mode="inline"
                className="sider-menu"
                selectedKeys={[active]}
                items={menuItems}
                onClick={({ key }) => setActive(key)}
              />
              <div className="sider-footer">
                <a
                  className="gh-link"
                  href="https://github.com/Siborne/git-switch"
                  target="_blank"
                  rel="noreferrer"
                  title={t('在 GitHub 上查看源码', 'View source on GitHub')}
                >
                  <GitHubIcon size={15} />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </Sider>
          <Content className="app-content">
            {contextHolder}
            <div className="app-header">
              <div>
                <div className="h-title">
                  {t(pageLabels[active as keyof typeof pageLabels][0], pageLabels[active as keyof typeof pageLabels][1])}
                </div>
                <div className="h-sub">{t('Git 身份与配置管理器', 'Git Identity & Profile Manager for Developers')}</div>
              </div>
              <div className="h-actions">
                <Button onClick={() => setLangPref(langPref === 'zh' ? 'en' : langPref === 'en' ? 'system' : 'zh')} title={t('切换语言', 'Switch language')}>
                  {langPref === 'system' ? t('跟随系统', 'Auto') : langPref === 'zh' ? '中文' : 'EN'}
                </Button>
                <Button icon={THEME_ICON[themePref]} onClick={cycleTheme} title={t('切换主题', 'Switch theme')} />
                <Select
                  size="middle"
                  style={{ width: 210 }}
                  placeholder={t('快速应用配置集…', 'Quick apply profile…')}
                  loading={quickApplying}
                  onChange={(id: string) => void quickApply(id)}
                  options={quickProfiles.map((p) => ({ value: p.id, label: p.name }))}
                  suffixIcon={null}
                />
              </div>
            </div>
            {active === 'settings' ? (
              <SettingsPage
                themePref={themePref}
                onThemeChange={handleThemeChange}
                langPref={langPref}
                onLangChange={handleLangChange}
                closeToTray={closeToTray}
                onCloseBehaviorChange={handleCloseBehaviorChange}
                versions={versions}
                gitVersion={gitVersion}
              />
            ) : (
              pages[active]
            )}
          </Content>
        </Layout>
        <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      </div>
    </ConfigProvider>
  )
}
