import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Space, Spin, Tag, Typography } from 'antd'
import { GitBranch, IdCard, ArrowLeftRight, History, Layers, ShieldCheck, Boxes } from 'lucide-react'
import type { ActualInclude, BackupMeta, IncludeRule, Profile } from '../../../shared/types'
import { t } from '../lib/i18n'

const STATUS_DOT = {
  ok: '#22c55e',
  off: '#f59e0b',
  none: 'rgba(255,255,255,0.18)'
}

function fmtGitVersion(v: string | null): string {
  if (!v) return '—'
  return v.replace(/^git version\s*/i, '').replace(/\.windows\.\d+$/, '')
}

export default function DashboardPage(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [includeRules, setIncludeRules] = useState<IncludeRule[]>([])
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [actual, setActual] = useState<ActualInclude[]>([])
  const [gitVersion, setGitVersion] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [p, inc, b, act, gv, un, ue] = await Promise.all([
        window.gitSwitch.profiles.list(),
        window.gitSwitch.include.list(),
        window.gitSwitch.backup.list(),
        window.gitSwitch.include.actual(),
        window.gitSwitch.git.version(),
        window.gitSwitch.git.getConfig('user.name'),
        window.gitSwitch.git.getConfig('user.email')
      ])
      setProfiles(p)
      setIncludeRules(inc)
      setBackups(b)
      setActual(act)
      setGitVersion(gv)
      setUserName(un?.trim() || null)
      setUserEmail(ue?.trim() || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const enabledRules = includeRules.filter((r) => r.enabled).length
  const matchedProfile = profiles.find(
    (p) =>
      p.items.some((i) => i.key === 'user.name' && i.value === userName) &&
      p.items.some((i) => i.key === 'user.email' && i.value === userEmail)
  )

  const stats = [
    {
      key: 'identity',
      label: t('当前全局身份', 'Global Identity'),
      icon: <ShieldCheck size={17} />,
      iconBg: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      value: userName ? (userName.length > 12 ? `${userName.slice(0, 12)}…` : userName) : '未设置',
      hint: userEmail ?? t('点击配置集可创建身份', 'Create via Profiles'),
      dot: userName ? STATUS_DOT.ok : STATUS_DOT.none
    },
    {
      key: 'profiles',
      label: t('配置集', 'Profiles'),
      icon: <IdCard size={17} />,
      iconBg: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      value: String(profiles.length),
      hint: '身份与配置项模板',
      dot: profiles.length > 0 ? STATUS_DOT.ok : STATUS_DOT.none
    },
    {
      key: 'include',
      label: t('自动切换', 'Auto Switch'),
      icon: <ArrowLeftRight size={17} />,
      iconBg: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
      value: `${enabledRules}/${includeRules.length}`,
      hint: t(`目录映射（${actual.length} 段已写入全局）`, `${actual.length} mapping(s) synced to global`),
      dot: enabledRules > 0 ? STATUS_DOT.ok : STATUS_DOT.off
    },
    {
      key: 'backups',
      label: t('备份点', 'Backups'),
      icon: <History size={17} />,
      iconBg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      value: String(backups.length),
      hint: '可随时回滚配置',
      dot: backups.length > 0 ? STATUS_DOT.ok : STATUS_DOT.none
    },
    {
      key: 'git',
      label: t('Git 版本', 'Git Version'),
      icon: <GitBranch size={17} />,
      iconBg: 'linear-gradient(135deg, #ef4444, #f97316)',
      value: fmtGitVersion(gitVersion),
      hint: gitVersion ? 'Git for Windows' : t('未检测到 git', 'git not found'),
      dot: gitVersion ? STATUS_DOT.ok : STATUS_DOT.off
    },
    {
      key: 'scope',
      label: t('配置层级', 'Config Scopes'),
      icon: <Layers size={17} />,
      iconBg: 'linear-gradient(135deg, #64748b, #94a3b8)',
      value: 'System / Global / Local',
      hint: t('低优先级 → 高优先级', 'low → high priority'),
      dot: STATUS_DOT.ok
    }
  ]

  return (
    <div className="page">
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {stats.map((s) => (
            <Col key={s.key} xs={24} sm={12} lg={8} xl={6}>
              <Card className="glass stat-card" styles={{ body: { padding: 0 } }}>
                <div className="stat-icon" style={{ background: s.iconBg, color: '#fff' }}>
                  {s.icon}
                </div>
                <div>
                  <div className="stat-label">
                    <Space size={6}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: s.dot,
                          display: 'inline-block'
                        }}
                      />
                      {s.label}
                    </Space>
                  </div>
                  <div className="stat-value" style={{ fontSize: s.key === 'scope' ? 18 : 26 }}>
                    {s.value}
                  </div>
                  <div className="stat-hint">{s.hint}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={14}>
            <Card className="glass" title={t('当前身份', 'Current Identity')} styles={{ body: { padding: 24 } }}>
              {userName || userEmail ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space size={12} align="center">
                    <span
                      className="pc-avatar"
                      style={{
                        width: 48,
                        height: 48,
                        fontSize: 20,
                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                      }}
                    >
                      {(userName ?? userEmail ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {userName ?? '未设置 user.name'}
                      </Typography.Title>
                      <Typography.Text type="secondary">{userEmail ?? '未设置 user.email'}</Typography.Text>
                    </div>
                  </Space>
                  <Space wrap>
                    {matchedProfile ? (
                      <Tag color="cyan" style={{ marginRight: 0 }}>
                        匹配配置集：{matchedProfile.name}
                      </Tag>
                    ) : (
                      <Tag style={{ marginRight: 0 }}>未匹配到配置集（可创建）</Tag>
                    )}
                    {actual.length > 0 && (
                      <Tag style={{ marginRight: 0 }} color="blue">
                        {actual.length} 条目录映射生效
                      </Tag>
                    )}
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={12}>
                  <Typography.Text type="secondary">
                    尚未设置全局 Git 身份。前往「配置集」创建你的第一个身份并一键应用。
                  </Typography.Text>
                  <Tag color="blue">快速开始：配置集 → 新建 → 填写 name/email → 应用全局</Tag>
                </Space>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="glass" title={t('环境', 'Environment')} styles={{ body: { padding: 24 } }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {[
                  { label: 'Git', value: fmtGitVersion(gitVersion) || '未检测到' },
                  { label: '配置集', value: String(profiles.length) },
                  { label: '自动切换规则', value: `${enabledRules} 启用 / ${includeRules.length} 总` },
                  { label: 'includeIf 段', value: `${actual.length} 条` },
                  { label: '备份点', value: `${backups.length} 个` }
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {row.label}
                    </Typography.Text>
                    <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{row.value}</Typography.Text>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                  <Boxes size={14} color="rgba(255,255,255,0.38)" />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    全部操作均有备份，可在「备份与回滚」中恢复
                  </Typography.Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
