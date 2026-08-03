import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import type { TableProps } from 'antd'
import { EyeInvisibleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import type { GitConfigEntry } from '../../../shared/types'

/** 敏感配置项匹配：命中则默认打码显示 */
const SENSITIVE_RE = /(proxy|extraheader|token|password|secret|credential|passwd)/i

const SCOPE_COLOR: Record<string, string> = {
  system: 'gold',
  global: 'cyan',
  local: 'green',
  worktree: 'purple',
  command: 'magenta'
}

function maskValue(v: string): string {
  if (v.length <= 4) return '••••'
  return `${v.slice(0, 4)}••••${v.slice(-2)}`
}

export default function ConfigBrowserPage(): React.JSX.Element {
  const [entries, setEntries] = useState<GitConfigEntry[]>([])
  const [gitVersion, setGitVersion] = useState<string | null>(null)
  const [gitFound, setGitFound] = useState<boolean | null>(null)
  const [scopeFilter, setScopeFilter] = useState('all')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [found, ver, list] = await Promise.all([
        window.gitSwitch.git.find(),
        window.gitSwitch.git.version(),
        window.gitSwitch.git.listConfig()
      ])
      setGitFound(!!found)
      setGitVersion(ver)
      setEntries(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleReveal = useCallback((rid: string): void => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(rid)) next.delete(rid)
      else next.add(rid)
      return next
    })
  }, [])

  const filtered = useMemo(
    () => (scopeFilter === 'all' ? entries : entries.filter((e) => e.scope === scopeFilter)),
    [entries, scopeFilter]
  )

  const scopeCount = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of entries) c[e.scope] = (c[e.scope] ?? 0) + 1
    return c
  }, [entries])

  const columns = useMemo<TableProps<GitConfigEntry>['columns']>(() => {
    return [
      {
        title: '配置项',
        dataIndex: 'key',
        key: 'key',
        width: 300,
        render: (k: string) => <span style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>{k}</span>
      },
      {
        title: '值',
        dataIndex: 'value',
        key: 'value',
        render: (v: string, r) => {
          const sensitive = SENSITIVE_RE.test(r.key)
          const rid = `${r.scope}|${r.origin}|${r.key}|${v}`
          const show = !sensitive || revealed.has(rid)
          return (
            <Space size={4}>
              <span style={{ fontFamily: 'Consolas, "Courier New", monospace', wordBreak: 'break-all' }}>
                {show ? v : maskValue(v)}
              </span>
              {sensitive && (
                <Button
                  type="text"
                  size="small"
                  icon={show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => toggleReveal(rid)}
                />
              )}
            </Space>
          )
        }
      },
      {
        title: 'Scope',
        dataIndex: 'scope',
        key: 'scope',
        width: 96,
        render: (s: string) => <Tag color={SCOPE_COLOR[s] ?? 'default'}>{s}</Tag>
      },
      {
        title: '来源文件',
        dataIndex: 'origin',
        key: 'origin',
        ellipsis: true,
        render: (o: string) => (
          <Tooltip title={o}>
            <span style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>{o}</span>
          </Tooltip>
        )
      }
    ]
  }, [revealed, toggleReveal])

  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          配置浏览器
        </Typography.Title>
        <Typography.Text type="secondary">Config browser</Typography.Text>
      </div>

      <Space wrap style={{ marginTop: 12, marginBottom: 12 }}>
        <Tag color={gitFound === false ? 'red' : 'cyan'}>{gitVersion ?? (gitFound === null ? '检测中…' : 'git 未找到')}</Tag>
        <Select
          value={scopeFilter}
          onChange={setScopeFilter}
          style={{ width: 180 }}
          options={[
            { value: 'all', label: `全部（${entries.length}）` },
            { value: 'system', label: `system（${scopeCount.system ?? 0}）` },
            { value: 'global', label: `global（${scopeCount.global ?? 0}）` },
            { value: 'local', label: `local（${scopeCount.local ?? 0}）` }
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      </Space>

      {error && (
        <Alert type="error" showIcon message="加载配置失败" description={error} style={{ marginBottom: 12 }} />
      )}
      {gitFound === false && !error && (
        <Alert
          type="warning"
          showIcon
          message="未检测到 git"
          description="请先安装 Git for Windows（https://git-scm.com/download/win），安装完成后点击刷新。"
          style={{ marginBottom: 12 }}
        />
      )}

      <Card className="glass" styles={{ body: { padding: 8 } }}>
        <Spin spinning={loading}>
          <Table<GitConfigEntry>
            rowKey={(_, i) => String(i)}
            size="small"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `共 ${t} 项` }}
            locale={{
              emptyText: <Empty description={loading ? '加载中…' : '暂无配置'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }}
          />
        </Spin>
      </Card>
    </div>
  )
}
