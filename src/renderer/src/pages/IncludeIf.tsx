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
  Switch,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import type { TableProps } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'
import type { ActualInclude, IncludeRule, Profile } from '../../../shared/types'

export default function IncludeIfPage(): React.JSX.Element {
  const [rules, setRules] = useState<IncludeRule[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [actual, setActual] = useState<ActualInclude[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editTarget, setEditTarget] = useState<IncludeRule | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<{ path: string; profileId: string }>()
  const [messageApi, contextHolder] = message.useMessage()

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [r, p, a] = await Promise.all([
        window.gitSwitch.include.list(),
        window.gitSwitch.profiles.list(),
        window.gitSwitch.include.actual()
      ])
      setRules(r)
      setProfiles(p)
      setActual(a)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = (): void => {
    setEditTarget(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (rule: IncludeRule): void => {
    setEditTarget(rule)
    form.setFieldsValue({ path: rule.path, profileId: rule.profileId })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    try {
      if (editTarget) {
        await window.gitSwitch.include.update(editTarget.id, { path: values.path, profileId: values.profileId })
        messageApi.success('规则已更新，记得点击「同步到全局配置」生效')
      } else {
        await window.gitSwitch.include.create({ path: values.path, profileId: values.profileId })
        messageApi.success('规则已创建，点击「同步到全局配置」生效')
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const remove = async (rule: IncludeRule): Promise<void> => {
    await window.gitSwitch.include.remove(rule.id)
    messageApi.success('规则已删除，点击「同步到全局配置」生效')
    await load()
  }

  const toggle = async (rule: IncludeRule, enabled: boolean): Promise<void> => {
    await window.gitSwitch.include.toggle(rule.id, enabled)
    messageApi.info(`${enabled ? '已启用' : '已禁用'}，点击「同步到全局配置」生效`)
    await load()
  }

  const sync = async (): Promise<void> => {
    setSyncing(true)
    try {
      const result = await window.gitSwitch.include.sync()
      if (result.conflicts.length > 0) {
        messageApi.warning(`已同步 ${result.applied.length} 条规则，但有 ${result.conflicts.length} 条冲突提示`)
      } else {
        messageApi.success(`已同步 ${result.applied.length} 条规则到全局配置`)
      }
      await load()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  const profileName = (id: string): string => profiles.find((p) => p.id === id)?.name ?? '（配置集已删除）'

  const columns: TableProps<IncludeRule>['columns'] = [
    {
      title: '目录规则',
      dataIndex: 'path',
      key: 'path',
      render: (v: string) => <span style={{ fontFamily: 'Consolas, monospace' }}>{v}/</span>
    },
    {
      title: '配置集',
      key: 'profile',
      width: 220,
      render: (_, r) => (
        <Select
          size="small"
          style={{ width: 200 }}
          value={r.profileId}
          options={profiles.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(id) => void window.gitSwitch.include.update(r.id, { path: r.path, profileId: id }).then(() => void load())}
        />
      )
    },
    {
      title: '启用',
      key: 'enabled',
      width: 80,
      render: (_, r) => <Switch size="small" checked={r.enabled} onChange={(v) => void toggle(r, v)} />
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={`删除规则 ${r.path}/？`} okText="删除" okButtonProps={{ danger: true }} onConfirm={() => void remove(r)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="page">
      {contextHolder}
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          自动切换
        </Typography.Title>
        <Typography.Text type="secondary">includeIf</Typography.Text>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={profiles.length === 0}>
          新建规则
        </Button>
        <Button type="primary" ghost icon={<SyncOutlined />} loading={syncing} onClick={() => void sync()}>
          同步到全局配置
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        按目录自动切换：进入映射目录后，git 会自动加载对应配置集，无需手动切换。基于 git 原生 includeIf 机制，同步前会自动备份全局配置。
      </Typography.Paragraph>

      {profiles.length === 0 && (
        <Alert
          type="info"
          showIcon
          message="还没有配置集"
          description="请先在「配置集」页面创建至少一个配置集，再建立目录映射。"
          style={{ marginBottom: 12 }}
        />
      )}

      <Card className="glass" title={`目录映射（${rules.length}）`} styles={{ body: { padding: 8 } }}>
        <Spin spinning={loading}>
          <Table<IncludeRule>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={rules}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无目录映射" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Spin>
      </Card>

      {actual.length > 0 && (
        <Card className="glass" title="全局配置中的实际 includeIf 段" style={{ marginTop: 16 }} styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {actual.map((a, i) => (
              <div key={i}>
                <Space size={6}>
                  <Tag color="cyan" style={{ fontFamily: 'Consolas, monospace' }}>
                    {a.dir}
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                    → {a.file}
                  </Typography.Text>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        title={editTarget ? `编辑规则 ${editTarget.path}/` : '新建目录映射'}
        open={modalOpen}
        onOk={() => void submit()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="path"
            label="目录"
            rules={[{ required: true, message: '请输入目录路径' }]}
            extra="支持绝对路径（D:\work）或 ~ 开头（~/work）；该目录及其子目录内的仓库都会自动使用所选配置集。"
          >
            <Input placeholder="D:\work 或 ~/work" style={{ fontFamily: 'Consolas, monospace' }} />
          </Form.Item>
          <Form.Item name="profileId" label="使用配置集" rules={[{ required: true, message: '请选择配置集' }]}>
            <Select placeholder="选择配置集" options={profiles.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
