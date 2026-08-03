import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd'
import type { TableProps } from 'antd'
import { Pencil, Trash2, FolderGit2, Plus, RefreshCw, GitBranch, Globe, GitCommitHorizontal } from 'lucide-react'
import type { GitConfigEntry, LastCommitInfo, Profile } from '../../../shared/types'
import { describeKey } from '../lib/keyDocs'
import { t } from '../lib/i18n'

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

export default function ProjectsPage(): React.JSX.Element {
  const [repoPath, setRepoPath] = useState('')
  const [opened, setOpened] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)
  const [branch, setBranch] = useState<string | null>(null)
  const [lastCommit, setLastCommit] = useState<LastCommitInfo | null>(null)
  const [localEntries, setLocalEntries] = useState<GitConfigEntry[]>([])
  const [allEntries, setAllEntries] = useState<GitConfigEntry[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('local')
  const [editTarget, setEditTarget] = useState<GitConfigEntry | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [applyProfileId, setApplyProfileId] = useState<string | null>(null)
  const [form] = Form.useForm<{ key: string; value: string }>()
  const [messageApi, contextHolder] = message.useMessage()

  const loadRepo = useCallback(async (path: string): Promise<void> => {
    const [all, url, br, lc] = await Promise.all([
      window.gitSwitch.git.listConfig({ cwd: path }),
      window.gitSwitch.git.remoteUrl(path),
      window.gitSwitch.git.currentBranch(path),
      window.gitSwitch.git.lastCommit(path)
    ])
    setAllEntries(all)
    setLocalEntries(all.filter((e) => e.scope === 'local'))
    setRemoteUrl(url)
    setBranch(br)
    setLastCommit(lc)
  }, [])

  const openRepo = async (): Promise<void> => {
    const path = repoPath.trim()
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const isRepo = await window.gitSwitch.git.isRepo(path)
      if (!isRepo) {
        setError(`「${path}」不是有效的 Git 仓库目录`)
        setOpened(false)
        return
      }
      await loadRepo(path)
      setOpened(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOpened(false)
    } finally {
      setLoading(false)
    }
  }

  const pickRepoDir = async (): Promise<void> => {
    const dir = await window.gitSwitch.dialog.pickDirectory()
    if (dir) {
      setRepoPath(dir)
      await openRepo()
    }
  }

  const reload = async (): Promise<void> => {
    if (!opened) return
    setLoading(true)
    try {
      await loadRepo(repoPath.trim())
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditTarget(null)
    form.resetFields()
    setEditOpen(true)
  }

  const openEdit = (entry: GitConfigEntry): void => {
    setEditTarget(entry)
    form.setFieldsValue({ key: entry.key, value: entry.value })
    setEditOpen(true)
  }

  const saveEntry = async (): Promise<void> => {
    const values = await form.validateFields()
    const key = values.key.trim()
    const cwd = repoPath.trim()
    try {
      await window.gitSwitch.git.setConfig(key, values.value, 'local', { cwd })
      messageApi.success(editTarget ? `已更新 ${key}` : `已新增 ${key}`)
      setEditOpen(false)
      await reload()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const removeEntry = async (entry: GitConfigEntry): Promise<void> => {
    try {
      await window.gitSwitch.git.unsetConfig(entry.key, 'local', { cwd: repoPath.trim() })
      messageApi.success(`已删除 ${entry.key}`)
      await reload()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const applyProfile = async (): Promise<void> => {
    if (!applyProfileId) return
    try {
      const r = await window.gitSwitch.profiles.applyRepo(applyProfileId, repoPath.trim())
      messageApi.success(`配置集已应用到项目（${r.applied} 项${r.backedUp ? '，原配置已备份' : ''}）`)
      await reload()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void window.gitSwitch.profiles.list().then(setProfiles)
  }, [])

  const localColumns: TableProps<GitConfigEntry>['columns'] = [
    {
      title: t('配置项', 'Key'),
      dataIndex: 'key',
      key: 'key',
      width: 300,
      render: (k: string) => {
        const doc = describeKey(k)
        const el = <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
        return doc ? <Tooltip title={doc}>{el}</Tooltip> : el
      }
    },
    {
      title: t('值', 'Value'),
      dataIndex: 'value',
      key: 'value',
      render: (v: string, r) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>{displayValue(r.key, v)}</span>
      )
    },
    {
      title: t('操作', 'Actions'),
      key: 'actions',
      width: 140,
      render: (_, entry) => (
        <Space size={4}>
          <Button size="small" icon={<Pencil size={13} />} onClick={() => openEdit(entry)}>
            编辑
          </Button>
          <Popconfirm title={`删除配置项 ${entry.key}？`} okText="删除" okButtonProps={{ danger: true }} onConfirm={() => void removeEntry(entry)}>
            <Button size="small" danger icon={<Trash2 size={13} />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const allColumns: TableProps<GitConfigEntry>['columns'] = [
    {
      title: t('配置项', 'Key'),
      dataIndex: 'key',
      key: 'key',
      width: 300,
      render: (k: string) => {
        const doc = describeKey(k)
        const el = <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
        return doc ? <Tooltip title={doc}>{el}</Tooltip> : el
      }
    },
    {
      title: t('值', 'Value'),
      dataIndex: 'value',
      key: 'value',
      render: (v: string, r) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>{displayValue(r.key, v)}</span>
      )
    },
    {
      title: t('Scope', 'Scope'),
      dataIndex: 'scope',
      key: 'scope',
      width: 96,
      render: (s: string) => <Tag className={SCOPE_CLASS[s] ?? ''} style={{ marginRight: 0 }}>{s}</Tag>
    },
    {
      title: t('来源文件', 'Origin'),
      dataIndex: 'origin',
      key: 'origin',
      ellipsis: true,
      render: (o: string) => (
        <Tooltip title={o}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{o}</span>
        </Tooltip>
      )
    }
  ]

  return (
    <div className="page">
      {contextHolder}
      <Space wrap style={{ marginTop: 12, marginBottom: 12 }}>
        <Input
          style={{ width: 380 }}
          placeholder="输入 Git 仓库目录，如 D:\work\project\git-switch"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          onPressEnter={() => void openRepo()}
        />
        <Button icon={<FolderGit2 size={15} />} onClick={() => void pickRepoDir()}>
          浏览…
        </Button>
        <Button type="primary" onClick={() => void openRepo()}>
          {t('打开仓库', 'Open Repo')}
        </Button>
        {opened && (
          <Button icon={<RefreshCw size={15} />} onClick={() => void reload()}>
            刷新
          </Button>
        )}
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />}

      {opened && (
        <Card className="glass" styles={{ body: { padding: 8 } }}>
          <Space size={12} style={{ marginBottom: 10, padding: '6px 8px 0' }} wrap>
            <Space size={6}>
              <GitBranch size={14} color="#22d3ee" />
              <Tag color="cyan" style={{ marginRight: 0 }}>
                {branch ?? 'detached HEAD'}
              </Tag>
            </Space>
            {remoteUrl ? (
              <Space size={6} style={{ minWidth: 0 }}>
                <Globe size={14} color="rgba(255,255,255,0.4)" />
                <Typography.Text
                  type="secondary"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  ellipsis={{ tooltip: remoteUrl }}
                >
                  {remoteUrl}
                </Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                未配置 remote origin
              </Typography.Text>
            )}
            {lastCommit && (
              <Space size={6} style={{ minWidth: 0 }}>
                <GitCommitHorizontal size={14} color="#8b5cf6" />
                <Tag style={{ marginRight: 0, fontFamily: "'JetBrains Mono', monospace", color: '#a78bfa', background: 'rgba(139,92,246,0.12)' }}>
                  {lastCommit.hash}
                </Tag>
                <Typography.Text style={{ fontSize: 12 }} ellipsis={{ tooltip: lastCommit.subject }}>
                  {lastCommit.subject}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                  {lastCommit.author} · {lastCommit.date}
                </Typography.Text>
              </Space>
            )}
          </Space>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'local',
                label: t('本地配置', 'Local Config'),
                children: (
                  <>
                    <Space style={{ marginBottom: 8 }}>
                      <Button size="small" type="primary" icon={<Plus size={13} />} onClick={openCreate}>
                        新增配置项
                      </Button>
                      <Select
                        size="small"
                        style={{ width: 240 }}
                        placeholder="应用已有配置集到此仓库…"
                        value={applyProfileId ?? undefined}
                        onChange={setApplyProfileId}
                        options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                      />
                      <Button size="small" type="primary" ghost disabled={!applyProfileId} onClick={() => void applyProfile()}>
                        应用配置集
                      </Button>
                    </Space>
                    <Spin spinning={loading}>
                      <Table<GitConfigEntry>
                        rowKey={(_, i) => String(i)}
                        size="small"
                        columns={localColumns}
                        dataSource={localEntries}
                        pagination={false}
                        locale={{ emptyText: <Empty description="该仓库暂无本地配置" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </Spin>
                  </>
                )
              },
              {
                key: 'all',
                label: t('生效配置', 'Effective Config'),
                children: (
                  <Spin spinning={loading}>
                    <Table<GitConfigEntry>
                      rowKey={(_, i) => String(i)}
                      size="small"
                      columns={allColumns}
                      dataSource={allEntries}
                      pagination={{ pageSize: 20, showSizeChanger: false }}
                      locale={{ emptyText: <Empty description="暂无配置" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                  </Spin>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* 新增 / 编辑配置项 */}
      <Modal
        title={editTarget ? `编辑配置项 ${editTarget.key}` : '新增配置项（写入 local scope）'}
        open={editOpen}
        onOk={() => void saveEntry()}
        onCancel={() => setEditOpen(false)}
        okText="保存"
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ key: '', value: '' }}>
          <Form.Item name="key" label="配置项 key" rules={[{ required: true, message: '请输入 key（如 user.email）' }]}>
            <Input placeholder="user.email" style={{ fontFamily: "'JetBrains Mono', monospace" }} disabled={editTarget !== null} />
          </Form.Item>
          <Form.Item name="value" label="值">
            <Input.TextArea placeholder="配置值" autoSize={{ minRows: 1, maxRows: 4 }} style={{ fontFamily: "'JetBrains Mono', monospace" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
