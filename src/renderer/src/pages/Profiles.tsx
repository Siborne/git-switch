import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
  Dropdown,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd'
import { Download, GitBranch, Globe, Pencil, Plus, Trash2, Upload, FolderGit2 } from 'lucide-react'
import type { Profile, ProfileInput } from '../../../shared/types'
import { describeKey } from '../lib/keyDocs'
import { t } from '../lib/i18n'

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

/** key 前缀 → Tag 样式（GitHub 风格：email 蓝 / company 青 / proxy 橙） */
function keyTagClass(key: string): string {
  if (/proxy/i.test(key)) return 'tag-scope-system'
  if (/company|email/i.test(key)) return 'tag-company'
  return 'tag-key'
}

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
  const [globalName, setGlobalName] = useState<string | null>(null)
  const [globalEmail, setGlobalEmail] = useState<string | null>(null)
  const [form] = Form.useForm<ProfileInput>()
  const [messageApi, contextHolder] = message.useMessage()

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [p, gn, ge] = await Promise.all([
        window.gitSwitch.profiles.list(),
        window.gitSwitch.git.getConfig('user.name'),
        window.gitSwitch.git.getConfig('user.email')
      ])
      setProfiles(p)
      setGlobalName(gn?.trim() || null)
      setGlobalEmail(ge?.trim() || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const isDefault = (p: Profile): boolean =>
    (globalName !== null &&
      p.items.some((i) => i.key === 'user.name' && i.value === globalName) &&
      p.items.some((i) => i.key === 'user.email' && i.value === globalEmail)) ||
    (globalName === null && globalEmail === null && profiles.length === 1)

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
      items: (values.items ?? [])
        .filter((i) => i && i.key && i.key.trim().length > 0)
        .map((i) => ({ key: i.key.trim(), value: i.value }))
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
      await load()
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
      { key: 'export-file', label: '导出到文件…', icon: <Download size={14} />, onClick: () => setExportTarget('file') },
      { key: 'export-clipboard', label: '导出到剪贴板', icon: <Download size={14} />, onClick: () => setExportTarget('clipboard') },
      { type: 'divider' as const },
      { key: 'import-file', label: '从文件导入…', icon: <Upload size={14} />, onClick: () => void doImportFile() },
      { key: 'import-clipboard', label: '从剪贴板导入', icon: <Upload size={14} />, onClick: () => void doImportClipboard() }
    ]
  }

  return (
    <div className="page">
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        <Dropdown menu={importExportMenu}>
          <Button icon={<Upload size={15} />}>{t('导入 / 导出', 'Import / Export')}</Button>
        </Dropdown>
        <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
          {t('新建配置集', 'New Profile')}
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        {t('管理多套 Git 身份与配置项，一键应用到全局或指定项目；应用前自动备份原配置，可随时回滚。', 'Manage multiple Git identities and config items — apply to global or a repo with one click; originals are auto-backed-up and restorable.')}
      </Typography.Paragraph>

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col key={i} xs={24} md={12} xl={8}>
              <Card className="glass">
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : profiles.length === 0 ? (
        <Card className="glass">
          <div className="empty-brand">
            <span className="empty-icon">
              <GitBranch size={34} />
            </span>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t('创建你的第一个配置集', 'Create your first profile')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('工作 / 个人 / 开源 —— 每套身份包含 user.name、user.email、签名密钥等配置项', 'Work / Personal / OSS — each profile holds user.name, user.email, signing key & more')}
            </Typography.Text>
            <Button type="primary" icon={<Plus size={15} />} onClick={openCreate} style={{ marginTop: 8 }}>
              {t('新建配置集', 'New Profile')}
            </Button>
          </div>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {profiles.map((p) => (
            <Col key={p.id} xs={24} md={12} xl={8}>
              <Card className="glass profile-card" styles={{ body: { padding: 0 } }}>
                <div className="pc-head">
                  <span className="pc-avatar">{(p.name || '?').charAt(0).toUpperCase()}</span>
                  <div className="pc-meta">
                    <Space size={6}>
                      <Typography.Text strong style={{ fontSize: 15 }}>
                        {p.name}
                      </Typography.Text>
                      {isDefault(p) && <Tag color="cyan" style={{ marginRight: 0 }}>使用中</Tag>}
                    </Space>
                    {p.description && (
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {p.description}
                      </Typography.Text>
                    )}
                  </div>
                  <div className="pc-actions">
                    <Button size="small" icon={<Pencil size={13} />} onClick={() => openEdit(p)} />
                    <Popconfirm
                      title={`删除配置集「${p.name}」？`}
                      okText="删除"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void remove(p)}
                    >
                      <Button size="small" danger icon={<Trash2 size={13} />} />
                    </Popconfirm>
                  </div>
                </div>
                <div className="pc-items">
                  {p.items.length === 0 ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      （空配置集）
                    </Typography.Text>
                  ) : (
                    p.items.map((it, idx) => {
                      const doc = describeKey(it.key)
                      const masked = SENSITIVE_RE.test(it.key) ? maskValue(it.value) : it.value
                      const tag = (
                        <Tag key={idx} className={`${keyTagClass(it.key)} kv-tag`} style={{ marginRight: 0 }}>
                          <span className="kv-key">{it.key}</span>
                          <span className="kv-eq">=</span>
                          <span className="kv-val">{masked}</span>
                        </Tag>
                      )
                      return doc ? (
                        <Tooltip key={idx} title={doc}>
                          {tag}
                        </Tooltip>
                      ) : (
                        tag
                      )
                    })
                  )}
                </div>
                <div className="pc-footer">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Globe size={13} />}
                    onClick={() => void applyGlobal(p)}
                  >
                    {t('应用全局', 'Apply Global')}
                  </Button>
                  <Button size="small" icon={<FolderGit2 size={13} />} onClick={() => openRepoApply(p)}>
                    {t('应用项目', 'Apply Repo')}
                  </Button>
                  <div style={{ flex: 1 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {fmtTime(p.createdAt)}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

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
                        <Input placeholder="user.email" style={{ width: '45%', fontFamily: "'JetBrains Mono', monospace" }} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'value']} noStyle>
                        <Input placeholder="值" style={{ width: '50%', fontFamily: "'JetBrains Mono', monospace" }} />
                      </Form.Item>
                      <Button icon={<Trash2 size={13} />} onClick={() => remove(field.name)} style={{ width: '5%' }} />
                    </Space.Compact>
                  ))}
                  <Button block type="dashed" onClick={() => add({ key: '', value: '' })} icon={<Plus size={14} />}>
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
          <Button icon={<FolderGit2 size={15} />} onClick={() => void pickRepoDir()}>
            浏览…
          </Button>
        </Space.Compact>
      </Modal>
    </div>
  )
}
