import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import type { TableProps } from 'antd'
import { FolderGit2, RefreshCw } from 'lucide-react'
import type { GitConfigEntry } from '../../../shared/types'

const SENSITIVE_RE = /(proxy|extraheader|token|password|secret|credential|passwd)/i

function maskValue(v: string): string {
  if (v.length <= 4) return '••••'
  return `${v.slice(0, 4)}••••${v.slice(-2)}`
}

function displayValue(key: string, value: string): string {
  return SENSITIVE_RE.test(key) ? maskValue(value) : value
}

const SCOPE_CLASS: Record<string, string> = {
  system: 'tag-scope-system',
  global: 'tag-scope-global',
  local: 'tag-scope-local',
  worktree: 'tag-scope-worktree',
  command: 'tag-scope-command'
}

/** 按 key 分组：entries 按配置顺序（低→高优先级），最后一条为最终生效值 */
interface KeyGroup {
  key: string
  entries: GitConfigEntry[]
  finalValue: string
  finalScope: string
}

function groupByKey(entries: GitConfigEntry[]): KeyGroup[] {
  const map = new Map<string, GitConfigEntry[]>()
  for (const e of entries) {
    const list = map.get(e.key) ?? []
    list.push(e)
    map.set(e.key, list)
  }
  return [...map.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => (SCOPE_ORDER[a.scope] ?? 0) - (SCOPE_ORDER[b.scope] ?? 0))
    const last = sorted[sorted.length - 1]
    return { key, entries: sorted, finalValue: last.value, finalScope: last.scope }
  })
}

const SCOPE_ORDER: Record<string, number> = { system: 0, global: 1, local: 2, worktree: 3, command: 4 }

export default function EffectiveViewPage(): React.JSX.Element {
  const [repoPath, setRepoPath] = useState('')
  const [groups, setGroups] = useState<KeyGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')

  const load = useCallback(async (path?: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const entries = await window.gitSwitch.git.listConfig(path ? { cwd: path } : undefined)
      setGroups(groupByKey(entries))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openRepo = async (): Promise<void> => {
    const path = repoPath.trim()
    if (!path) return
    const isRepo = await window.gitSwitch.git.isRepo(path)
    if (!isRepo) {
      setError(`「${path}」不是有效的 Git 仓库目录`)
      return
    }
    await load(path)
  }

  const pickRepoDir = async (): Promise<void> => {
    const dir = await window.gitSwitch.dialog.pickDirectory()
    if (dir) {
      setRepoPath(dir)
      await openRepo()
    }
  }

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (scopeFilter !== 'all' && !g.entries.some((e) => e.scope === scopeFilter)) return false
      if (keyword && !g.key.toLowerCase().includes(keyword.toLowerCase())) return false
      return true
    })
  }, [groups, scopeFilter, keyword])

  const columns = useMemo<TableProps<KeyGroup>['columns']>(() => {
    return [
      {
        title: '配置项',
        dataIndex: 'key',
        key: 'key',
        width: 280,
        render: (k: string) => <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
      },
      {
        title: '最终生效值',
        key: 'final',
        width: 300,
        render: (_, g) => (
          <Space size={6}>
            <Typography.Text strong style={{ fontFamily: "'JetBrains Mono', monospace", color: '#60a5fa' }}>
              {displayValue(g.key, g.finalValue)}
            </Typography.Text>
            <Tag className={SCOPE_CLASS[g.finalScope] ?? ''} style={{ marginRight: 0 }}>
              {g.finalScope}
            </Tag>
          </Space>
        )
      },
      {
        title: '覆盖链（低 → 高优先级）',
        key: 'chain',
        render: (_, g) => (
          <Space size={[4, 4]} wrap>
            {g.entries.map((e, i) => (
              <Tooltip key={i} title={e.origin}>
                <Tag className={SCOPE_CLASS[e.scope] ?? ''} style={{ marginRight: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                  {e.scope}: {displayValue(g.key, e.value)}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        )
      }
    ]
  }, [])

  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          生效值
        </Typography.Title>
        <Typography.Text type="secondary">Effective values</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        system / global / local 多层叠加后的最终生效配置；不选择仓库时展示当前目录视角，可选择仓库查看其生效配置。
      </Typography.Paragraph>

      <Space wrap style={{ marginTop: 4, marginBottom: 12 }}>
        <Input
          style={{ width: 380 }}
          placeholder="可选：Git 仓库目录（留空 = 当前目录视角）"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          onPressEnter={() => void openRepo()}
        />
        <Button icon={<FolderGit2 size={15} />} onClick={() => void pickRepoDir()}>
          浏览…
        </Button>
        <Button onClick={() => void load(repoPath.trim() || undefined)} icon={<RefreshCw size={15} />}>
          加载
        </Button>
        <Input.Search
          style={{ width: 200 }}
          placeholder="搜索配置项…"
          allowClear
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          style={{ width: 150 }}
          value={scopeFilter}
          onChange={setScopeFilter}
          options={[
            { value: 'all', label: '全部层' },
            { value: 'system', label: 'system' },
            { value: 'global', label: 'global' },
            { value: 'local', label: 'local' },
            { value: 'worktree', label: 'worktree' }
          ]}
        />
        <Typography.Text type="secondary">共 {filtered.length} 个配置项</Typography.Text>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />}

      <Card className="glass" styles={{ body: { padding: 8 } }}>
        <Spin spinning={loading}>
          <Table<KeyGroup>
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="暂无配置" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Spin>
      </Card>
    </div>
  )
}
