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
import { DeleteOutlined, EditOutlined, FolderOpenOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { GitConfigEntry, Profile } from '../../../shared/types'

const SENSITIVE_RE = /(proxy|extraheader|token|password|secret|credential|passwd)/i

function maskValue(v: string): string {
  if (v.length <= 4) return '••••'
  return `${v.slice(0, 4)}••••${v.slice(-2)}`
}

function displayValue(key: string, value: string): string {
  return SENSITIVE_RE.test(key) ? maskValue(value) : value
}

const SCOPE_COLOR: Record<string, string> = {
  system: 'gold',
  global: 'cyan',
  local: 'green',
  worktree: 'purple',
  command: 'magenta'
}

export default function ProjectsPage(): React.JSX.Element {
  const [repoPath, setRepoPath] = useState('')
  const [opened, setOpened] = useState(false)
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
    const all = await window.gitSwitch.git.listConfig({ cwd: path })
    setAllEntries(all)
    setLocalEntries(all.filter((e) => e.scope === 'local'))
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
      title: '配置项',
      dataIndex: 'key',
      key: 'key',
      width: 300,
      render: (k: string) => <span style={{ fontFamily: 'Consolas, monospace' }}>{k}</span>
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (v: string, r) => (
        <span style={{ fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{displayValue(r.key, v)}</span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, entry) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(entry)}>
            编辑
          </Button>
          <Popconfirm title={`删除配置项 ${entry.key}？`} okText="删除" okButtonProps={{ danger: true }} onConfirm={() => void removeEntry(entry)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const allColumns: TableProps<GitConfigEntry>['columns'] = [
    {
      title: '配置项',
      dataIndex: 'key',
      key: 'key',
      width: 300,
      render: (k: string) => <span style={{ fontFamily: 'Consolas, monospace' }}>{k}</span>
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (v: string, r) => (
        <span style={{ fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{displayValue(r.key, v)}</span>
      )
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
          <span style={{ fontFamily: 'Consolas, monospace' }}>{o}</span>
        </Tooltip>
      )
    }
  ]

  return (
    <div className="page">
      {contextHolder}
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          项目配置
        </Typography.Title>
        <Typography.Text type="secondary">Local scope</Typography.Text>
      </div>

      <Space wrap style={{ marginTop: 12, marginBottom: 12 }}>
        <Input
          style={{ width: 380 }}
          placeholder="输入 Git 仓库目录，如 D:\work\project\git-switch"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          onPressEnter={() => void openRepo()}
        />
        <Button icon={<FolderOpenOutlined />} onClick={() => void pickRepoDir()}>
          浏览…
        </Button>
        <Button type="primary" onClick={() => void openRepo()}>
          打开仓库
        </Button>
        {opened && (
          <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
            刷新
          </Button>
        )}
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} closable onClose={() => setError(null)} />}

      {opened && (
        <Card className="glass" styles={{ body: { padding: 8 } }}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'local',
                label: `本地配置（${localEntries.length}）`,
                children: (
                  <>
                    <Space style={{ marginBottom: 8 }}>
                      <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
                label: `生效配置（${allEntries.length}）`,
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
            <Input placeholder="user.email" style={{ fontFamily: 'Consolas, monospace' }} disabled={editTarget !== null} />
          </Form.Item>
          <Form.Item name="value" label="值">
            <Input.TextArea placeholder="配置值" autoSize={{ minRows: 1, maxRows: 4 }} style={{ fontFamily: 'Consolas, monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
