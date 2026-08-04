import { Button, Card, Radio, Space, Tag, Typography } from 'antd'
import { ExternalLink, Monitor, Moon, Sun } from 'lucide-react'
import { t } from '../lib/i18n'
import type { ThemePref } from '../lib/settings'

interface Props {
  themePref: ThemePref
  onThemeChange: (v: ThemePref) => void
  langPref: 'system' | 'zh' | 'en'
  onLangChange: (v: 'system' | 'zh' | 'en') => void
  closeToTray: boolean
  onCloseBehaviorChange: (v: boolean) => void
  versions: { electron: string; node: string; chrome: string } | null
  gitVersion: string | null
}

export default function SettingsPage(props: Props): React.JSX.Element {
  const { themePref, onThemeChange, langPref, onLangChange, closeToTray, onCloseBehaviorChange, versions, gitVersion } = props

  return (
    <div className="page">
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        {t('主题与语言默认跟随系统，也可手动指定。', 'Theme and language follow the system by default; you can override them.')}
      </Typography.Paragraph>

      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 1000 }}>
        <Card className="glass" title={t('外观', 'Appearance')}>
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 10 }}>
                {t('主题', 'Theme')}
              </Typography.Text>
              <Radio.Group
                value={themePref}
                onChange={(e) => onThemeChange(e.target.value as ThemePref)}
                optionType="button"
                buttonStyle="solid"
                className="pill-radio"
                options={[
                  { value: 'system', label: <><Monitor size={14} /> {t('跟随系统', 'System')}</> },
                  { value: 'dark', label: <><Moon size={14} /> {t('深色', 'Dark')}</> },
                  { value: 'light', label: <><Sun size={14} /> {t('浅色', 'Light')}</> }
                ]}
              />
            </div>
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 10 }}>
                {t('语言', 'Language')}
              </Typography.Text>
              <Radio.Group
                value={langPref}
                onChange={(e) => onLangChange(e.target.value as 'system' | 'zh' | 'en')}
                optionType="button"
                buttonStyle="solid"
                className="pill-radio"
                options={[
                  { value: 'system', label: t('跟随系统', 'System') },
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' }
                ]}
              />
            </div>
          </Space>
        </Card>

        <Card className="glass" title={t('窗口', 'Window')}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 10 }}>
            {t('点击关闭按钮时', 'When clicking close')}
          </Typography.Text>
          <Radio.Group
            value={closeToTray}
            onChange={(e) => onCloseBehaviorChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            className="pill-radio"
            options={[
              { value: true, label: t('最小化到系统托盘', 'Minimize to tray') },
              { value: false, label: t('直接退出', 'Quit') }
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            {t('最小化到托盘后，可从托盘菜单恢复窗口或快速切换身份。', 'When minimized to tray, restore the window or switch identities from the tray menu.')}
          </Typography.Paragraph>
        </Card>

        <Card className="glass" title={t('关于', 'About')}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">Git Switch</Typography.Text>
              <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace" }}>v0.2.1</Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">Git</Typography.Text>
              <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {gitVersion ? gitVersion.replace(/^git version\s*/i, '') : '—'}
              </Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">Electron</Typography.Text>
              <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace" }}>{versions?.electron ?? '—'}</Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">Node</Typography.Text>
              <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace" }}>{versions?.node ?? '—'}</Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary">Chromium</Typography.Text>
              <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace" }}>{versions?.chrome ?? '—'}</Typography.Text>
            </div>
            <Space style={{ marginTop: 8 }}>
              <Tag color="blue">MIT</Tag>
              <Button size="small" icon={<ExternalLink size={13} />} href="https://github.com/Siborne/git-switch" target="_blank">
                GitHub
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
