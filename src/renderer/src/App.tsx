import { useEffect, useState } from 'react'
import { Layout, Menu } from 'antd'
import {
  GitBranch,
  IdCard,
  FolderGit2,
  Layers,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  LayoutDashboard
} from 'lucide-react'
import ProfilesPage from './pages/Profiles'
import ProjectsPage from './pages/Projects'
import EffectiveViewPage from './pages/EffectiveView'
import ConfigBrowserPage from './pages/ConfigBrowser'
import BackupsPage from './pages/Backups'
import IncludeIfPage from './pages/IncludeIf'
import DashboardPage from './pages/Dashboard'
import OnboardingModal from './components/OnboardingModal'

const { Sider, Content } = Layout

const menuItems = [
  { key: 'dashboard', icon: <LayoutDashboard size={17} />, label: '概览' },
  { key: 'profiles', icon: <IdCard size={17} />, label: '配置集' },
  { key: 'projects', icon: <FolderGit2 size={17} />, label: '项目配置' },
  { key: 'effective', icon: <Layers size={17} />, label: '生效值' },
  { key: 'include', icon: <ArrowLeftRight size={17} />, label: '自动切换' },
  { key: 'browser', icon: <SlidersHorizontal size={17} />, label: '配置浏览器' },
  { key: 'backups', icon: <History size={17} />, label: '备份与回滚' }
]

const pages: Record<string, React.ReactNode> = {
  dashboard: <DashboardPage />,
  profiles: <ProfilesPage />,
  projects: <ProjectsPage />,
  effective: <EffectiveViewPage />,
  include: <IncludeIfPage />,
  browser: <ConfigBrowserPage />,
  backups: <BackupsPage />
}

export default function App(): React.JSX.Element {
  const [active, setActive] = useState('dashboard')
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [versions, setVersions] = useState<{ electron: string; node: string; chrome: string } | null>(null)
  const [gitVersion, setGitVersion] = useState<string | null>(null)

  useEffect(() => {
    setVersions(window.gitSwitch.versions)
    void window.gitSwitch.git.version().then(setGitVersion).catch(() => undefined)
    void window.gitSwitch.onboarding.status().then((done) => {
      if (!done) setOnboardingOpen(true)
    })
  }, [])

  const pageTitle: Record<string, string> = {
    dashboard: '概览',
    profiles: '配置集',
    projects: '项目配置',
    effective: '生效值',
    include: '自动切换',
    browser: '配置浏览器',
    backups: '备份与回滚'
  }

  return (
    <Layout className="app-shell">
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
            <div className="ver">
              <span>Git</span>
              <b>{gitVersion ? gitVersion.replace(/^git version\s*/i, '').split(' ')[0] : '—'}</b>
            </div>
            <div className="ver">
              <span>Electron</span>
              <b>{versions?.electron ?? '—'}</b>
            </div>
            <div className="ver">
              <span>Node</span>
              <b>{versions?.node ?? '—'}</b>
            </div>
          </div>
        </div>
      </Sider>
      <Content className="app-content">
        <div className="app-header">
          <div>
            <div className="h-title">{pageTitle[active]}</div>
            <div className="h-sub">Git Identity &amp; Profile Manager for Developers</div>
          </div>
        </div>
        {pages[active]}
      </Content>
      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </Layout>
  )
}
