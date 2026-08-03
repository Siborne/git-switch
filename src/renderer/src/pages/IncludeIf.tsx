import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message
} from 'antd'
import { ArrowRight, GitBranch, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { ActualInclude, IncludeRule, Profile } from '../../../shared/types'
import { t } from '../lib/i18n'

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

  return (
    <div className="page">
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        <Button type="primary" icon={<Plus size={15} />} onClick={openCreate} disabled={profiles.length === 0}>
          {t('新建映射', 'New Mapping')}
        </Button>
        <Button type="primary" ghost icon={<RefreshCw size={15} />} loading={syncing} onClick={() => void sync()}>
          {t('同步到全局配置', 'Sync to Global')}
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 20 }}>
        按目录自动切换：进入映射目录后，git 会自动加载对应配置集，无需手动切换。基于 git 原生 includeIf 机制，同步前自动备份全局配置。
      </Typography.Paragraph>

      {profiles.length === 0 && (
        <Alert
          type="info"
          showIcon
          message="还没有配置集"
          description="请先在「配置集」页面创建至少一个配置集，再建立目录映射。"
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        {rules.length === 0 ? (
          <Card className="glass">
            <div className="empty-brand">
              <span className="empty-icon">
                <GitBranch size={34} />
              </span>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {t('建立第一个目录映射', 'Create the first folder mapping')}
              </Typography.Title>
              <Typography.Text type="secondary">
                {t('如 D:\work → 工作身份，D:\oss → 个人身份', 'e.g. D:\work → Work, D:\oss → Personal')}
              </Typography.Text>
              <Button
                type="primary"
                icon={<Plus size={15} />}
                onClick={openCreate}
                disabled={profiles.length === 0}
                style={{ marginTop: 8 }}
              >
                新建映射
              </Button>
            </div>
          </Card>
        ) : (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {rules.map((r) => (
              <div key={r.id} className="folder-map">
                <Tag
                  className={r.enabled ? 'tag-scope-worktree' : ''}
                  style={{ marginRight: 0, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}
                >
                  {r.enabled ? '已启用' : '已禁用'}
                </Tag>
                <span className="fm-dir">{r.path}/</span>
                <span className="fm-arrow">
                  <ArrowRight size={16} />
                </span>
                <span className="fm-profile">{profileName(r.profileId)}</span>
                <div className="fm-actions">
                  <Space size={4}>
                    <Switch size="small" checked={r.enabled} onChange={(v) => void toggle(r, v)} />
                    <Button size="small" icon={<Pencil size={13} />} onClick={() => openEdit(r)} />
                    <Popconfirm title={`删除映射 ${r.path}/？`} okText="删除" okButtonProps={{ danger: true }} onConfirm={() => void remove(r)}>
                      <Button size="small" danger icon={<Trash2 size={13} />} />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))}
          </Space>
        )}
      </Spin>

      {actual.length > 0 && (
        <Card className="glass" title="全局配置中的实际 includeIf 段" style={{ marginTop: 16 }} styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {actual.map((a, i) => (
              <div key={i}>
                <Space size={6}>
                  <Tag className="tag-scope-includeif" style={{ marginRight: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    {a.dir}
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    → {a.file}
                  </Typography.Text>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        title={editTarget ? `编辑映射 ${editTarget.path}/` : '新建目录映射'}
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
            <Input placeholder="D:\work 或 ~/work" style={{ fontFamily: "'JetBrains Mono', monospace" }} />
          </Form.Item>
          <Form.Item name="profileId" label="使用配置集" rules={[{ required: true, message: '请选择配置集' }]}>
            <Select placeholder="选择配置集" options={profiles.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
