import { useState } from 'react'
import { Layout, Menu, Tag } from 'antd'
import {
  AppstoreOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  IdcardOutlined,
  RadarChartOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import ProfilesPage from './pages/Profiles'
import ProjectsPage from './pages/Projects'
import EffectiveViewPage from './pages/EffectiveView'
import ConfigBrowserPage from './pages/ConfigBrowser'
import BackupsPage from './pages/Backups'

const { Sider, Content } = Layout

const menuItems = [
  { key: 'profiles', icon: <IdcardOutlined />, label: '配置集' },
  { key: 'projects', icon: <FolderOpenOutlined />, label: '项目配置' },
  { key: 'effective', icon: <RadarChartOutlined />, label: '生效值' },
  { key: 'browser', icon: <AppstoreOutlined />, label: '配置浏览器' },
  { key: 'backups', icon: <HistoryOutlined />, label: '备份与回滚' }
]

const pages: Record<string, React.ReactNode> = {
  profiles: <ProfilesPage />,
  projects: <ProjectsPage />,
  effective: <EffectiveViewPage />,
  browser: <ConfigBrowserPage />,
  backups: <BackupsPage />
}

export default function App(): React.JSX.Element {
  const [active, setActive] = useState('profiles')
  const ver = window.gitSwitch?.versions

  return (
    <Layout className="app-shell">
      <Sider width={216} theme="dark" className="sider-glass glass">
        <div className="logo">
          <span className="logo-badge">
            <BranchesOutlined />
          </span>
          <span className="gradient-text">Git Switch</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[active]}
          items={menuItems}
          onClick={({ key }) => setActive(key)}
        />
        <div className="sider-footer">
          <div>
            {ver ? `Electron ${ver.electron} · Node ${ver.node}` : 'Electron'}
          </div>
          <div style={{ marginTop: 4 }}>
            <Tag style={{ marginRight: 0 }} color="cyan">
              v0.1.0 · M1 开发中
            </Tag>
          </div>
        </div>
      </Sider>
      <Content style={{ overflow: 'hidden' }}>
        {pages[active]}
      </Content>
    </Layout>
  )
}
