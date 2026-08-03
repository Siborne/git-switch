import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import type { TableProps } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  ImportOutlined,
  PlusOutlined
} from '@ant-design/icons'
import type { Profile, ProfileInput } from '../../../shared/types'

const SENSITIVE_RE = /(proxy|extraheader|token|password|secret|credential|passwd)/i

function maskValue(v: string): string {
  if (v.length <= 4) return '••••'
  return `${v.slice(0, 4)}••••${v.slice(-2)}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

/** 常用配置项模板，一键添加 */
const TEMPLATE_ITEMS: { key: string; label: string }[] = [
  { key: 'user.name', label: 'user.name · 提交者姓名' },
  { key: 'user.email', label: 'user.email · 提交者邮箱' },
  { key: 'user.signingkey', label: 'user.signingkey · 签名密钥' },
  { key: 'commit.gpgsign', label: 'commit.gpgsign · 提交签名开关' },
  { key: 'http.proxy', label: 'http.proxy · HTTP 代理' },
  { key: 'core.autocrlf', label: 'core.autocrlf · 换行符转换' },
  { key: 'init.defaultBranch', label: 'init.defaultBranch · 默认分支名' },
  { key: 'pull.rebase', label: 'pull.rebase · pull 策略' }
]

export default function ProfilesPage(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [repoTarget, setRepoTarget] = useState<Profile | null>(null)
  const [repoPath, setRepoPath] = useState('')
  const [applying, setApplying] = useState(false)
  const [exportTarget, setExportTarget] = useState<'file' | 'clipboard' | null>(null)
  const [exportSecrets, setExportSecrets] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [form] = Form.useForm<ProfileInput>()
  const [messageApi, contextHolder] = message.useMessage()

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setProfiles(await window.gitSwitch.profiles.list())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = (): void => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (p: Profile): void => {
    setEditing(p)
    form.setFieldsValue({ name: p.name, description: p.description ?? '', items: p.items })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    const input: ProfileInput = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      items: (values.items ?? []).filter((i) => i && i.key && i.key.trim().length > 0).map((i) => ({ key: i.key.trim(), value: i.value }))
    }
    if (editing) {
      await window.gitSwitch.profiles.update(editing.id, input)
      messageApi.success('配置集已更新')
    } else {
      await window.gitSwitch.profiles.create(input)
      messageApi.success('配置集已创建')
    }
    setModalOpen(false)
    await load()
  }

  const applyGlobal = async (p: Profile): Promise<void> => {
    try {
      const r = await window.gitSwitch.profiles.applyGlobal(p.id)
      messageApi.success(`「${p.name}」已应用到全局（${r.applied} 项${r.backedUp ? '，原配置已备份' : ''}）`)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const openRepoApply = (p: Profile): void => {
    setRepoTarget(p)
    setRepoPath('')
  }

  const pickRepoDir = async (): Promise<void> => {
    const dir = await window.gitSwitch.dialog.pickDirectory()
    if (dir) setRepoPath(dir)
  }

  const applyRepo = async (): Promise<void> => {
    if (!repoTarget || !repoPath.trim()) return
    setApplying(true)
    try {
      const r = await window.gitSwitch.profiles.applyRepo(repoTarget.id, repoPath.trim())
      messageApi.success(`「${repoTarget.name}」已应用到仓库 ${repoPath}（${r.applied} 项${r.backedUp ? '，原配置已备份' : ''}）`)
      setRepoTarget(null)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setApplying(false)
    }
  }

  const remove = async (p: Profile): Promise<void> => {
    await window.gitSwitch.profiles.remove(p.id)
    messageApi.success(`配置集「${p.name}」已删除`)
    await load()
  }

  const doExport = async (): Promise<void> => {
    if (!exportTarget) return
    setExportBusy(true)
    try {
      if (exportTarget === 'file') {
        const path = await window.gitSwitch.profiles.exportFile(exportSecrets)
        if (path) messageApi.success(`已导出到 ${path}`)
      } else {
        await window.gitSwitch.profiles.exportClipboard(exportSecrets)
        messageApi.success(exportSecrets ? '已复制到剪贴板（含敏感项明文）' : '已复制到剪贴板（敏感项已脱敏）')
      }
      setExportTarget(null)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setExportBusy(false)
    }
  }

  const doImportFile = async (): Promise<void> => {
    try {
      const result = await window.gitSwitch.profiles.importFile()
      if (result === null) return
      reportImport(result)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const doImportClipboard = async (): Promise<void> => {
    try {
      const result = await window.gitSwitch.profiles.importClipboard()
      reportImport(result)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const reportImport = (result: { created: string[]; skipped: string[] }): void => {
    const parts: string[] = []
    if (result.created.length > 0) parts.push(`成功导入 ${result.created.length} 个：${result.created.join('、')}`)
    if (result.skipped.length > 0) parts.push(`跳过同名 ${result.skipped.length} 个：${result.skipped.join('、')}`)
    messageApi.success(parts.join('；') || '没有可导入的配置集')
    void load()
  }

  const importExportMenu = {
    items: [
      { key: 'export-file', label: '导出到文件…', onClick: () => setExportTarget('file') },
      { key: 'export-clipboard', label: '导出到剪贴板', onClick: () => setExportTarget('clipboard') },
      { type: 'divider' as const },
      { key: 'import-file', label: '从文件导入…', onClick: () => void doImportFile() },
      { key: 'import-clipboard', label: '从剪贴板导入', onClick: () => void doImportClipboard() }
    ]
  }

  const columns: TableProps<Profile>['columns'] = [
    {
      title: '配置集',
      key: 'name',
      width: 220,
      render: (_, p) => (
        <div>
          <Typography.Text strong>{p.name}</Typography.Text>
          {p.description && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {p.description}
              </Typography.Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: '配置项',
      key: 'items',
      render: (_, p) => (
        <Space size={[4, 4]} wrap>
          {p.items.length === 0 && <Typography.Text type="secondary">（空）</Typography.Text>}
          {p.items.map((it, idx) => (
            <Tag key={idx} style={{ fontFamily: 'Consolas, monospace' }}>
              {it.key}={SENSITIVE_RE.test(it.key) ? maskValue(it.value) : it.value}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 170,
      render: (_, p) => <Typography.Text type="secondary">{fmtTime(p.createdAt)}</Typography.Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 290,
      render: (_, p) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(p)}>
            编辑
          </Button>
          <Popconfirm
            title={`应用「${p.name}」到全局？`}
            description="覆盖同名配置项，保留其余项；原配置会自动备份可回滚。"
            okText="应用"
            onConfirm={() => void applyGlobal(p)}
          >
            <Button size="small" icon={<GlobalOutlined />}>
              应用全局
            </Button>
          </Popconfirm>
          <Button size="small" icon={<FolderOpenOutlined />} onClick={() => openRepoApply(p)}>
            应用项目
          </Button>
          <Popconfirm title={`删除配置集「${p.name}」？`} okText="删除" okButtonProps={{ danger: true }} onConfirm={() => void remove(p)}>
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
          配置集
        </Typography.Title>
        <Typography.Text type="secondary">Profiles</Typography.Text>
        <div style={{ flex: 1 }} />
        <Dropdown menu={importExportMenu}>
          <Button icon={<ImportOutlined />}>导入 / 导出</Button>
        </Dropdown>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建配置集
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        管理多套 Git 身份与配置项，一键应用到全局或指定项目；应用前自动备份原配置，可随时回滚。
      </Typography.Paragraph>

      <Card className="glass" styles={{ body: { padding: 8 } }}>
        <Spin spinning={loading}>
          <Table<Profile>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={profiles}
            pagination={false}
            locale={{ emptyText: <Empty description="还没有配置集，点击右上角新建" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Spin>
      </Card>

      {/* 新建 / 编辑 */}
      <Modal
        title={editing ? `编辑配置集「${editing.name}」` : '新建配置集'}
        open={modalOpen}
        onOk={() => void submit()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ name: '', description: '', items: [] }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入配置集名称' }]}>
            <Input placeholder="如：工作 / 个人 / 开源" maxLength={40} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="可选，一句话说明用途" maxLength={100} />
          </Form.Item>
          <Form.Item label="配置项">
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Select
                style={{ flex: 1 }}
                placeholder="从模板快速添加…"
                options={TEMPLATE_ITEMS.map((t) => ({ value: t.key, label: t.label }))}
                onChange={(key: string) => {
                  const items: { key: string; value: string }[] = form.getFieldValue('items') ?? []
                  if (!items.some((i) => i.key === key)) {
                    form.setFieldValue('items', [...items, { key, value: '' }])
                  }
                }}
              />
            </Space.Compact>
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fields.map((field) => (
                    <Space.Compact key={field.key} style={{ width: '100%' }}>
                      <Form.Item name={[field.name, 'key']} noStyle rules={[{ required: true, message: 'key 必填' }]}>
                        <Input placeholder="user.email" style={{ width: '45%', fontFamily: 'Consolas, monospace' }} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'value']} noStyle>
                        <Input placeholder="值" style={{ width: '50%', fontFamily: 'Consolas, monospace' }} />
                      </Form.Item>
                      <Button icon={<DeleteOutlined />} onClick={() => remove(field.name)} style={{ width: '5%' }} />
                    </Space.Compact>
                  ))}
                  <Button block type="dashed" onClick={() => add({ key: '', value: '' })} icon={<PlusOutlined />}>
                    添加配置项
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导出选项 */}
      <Modal
        title={exportTarget === 'file' ? '导出配置集到文件' : '导出配置集到剪贴板'}
        open={exportTarget !== null}
        onOk={() => void doExport()}
        onCancel={() => setExportTarget(null)}
        okText="导出"
        confirmLoading={exportBusy}
        width={460}
      >
        <Checkbox checked={exportSecrets} onChange={(e) => setExportSecrets(e.target.checked)}>
          包含敏感项明文（token / proxy / credential 等）
        </Checkbox>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          默认不勾选：敏感配置项导出时脱敏为 ••••，适合分享/提交到仓库。
        </Typography.Paragraph>
      </Modal>

      {/* 应用到项目 */}
      <Modal
        title={`应用「${repoTarget?.name ?? ''}」到项目`}
        open={repoTarget !== null}
        onOk={() => void applyRepo()}
        onCancel={() => setRepoTarget(null)}
        okText="应用"
        confirmLoading={applying}
        okButtonProps={{ disabled: !repoPath.trim() }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          选择目标 Git 仓库目录，配置集将写入该仓库的 local scope（覆盖同名项，原配置自动备份）。
        </Typography.Paragraph>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="D:\work\project\some-repo" />
          <Button icon={<FolderOpenOutlined />} onClick={() => void pickRepoDir()}>
            浏览…
          </Button>
        </Space.Compact>
      </Modal>
    </div>
  )
}
