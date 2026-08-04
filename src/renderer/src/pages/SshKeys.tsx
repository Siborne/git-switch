import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { Copy, KeyRound, Plus, RefreshCw, Settings2, Eye, Pencil } from 'lucide-react'
import { t } from '../lib/i18n'
import type { SshKeyStatus, SshKeyType } from '../../../shared/types'

const TYPE_LABEL: Record<SshKeyType | 'unknown', string> = {
  ed25519: 'ed25519',
  rsa: 'RSA 4096',
  unknown: '?'
}

function maskFingerprint(fp?: string): string {
  if (!fp) return '—'
  return fp.length > 24 ? `${fp.slice(0, 18)}…${fp.slice(-6)}` : fp
}

export default function SshKeysPage(): React.JSX.Element {
  const [keys, setKeys] = useState<SshKeyStatus[]>([])
  const [sshOk, setSshOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genForm] = Form.useForm<{ type: SshKeyType; comment?: string; fileName?: string }>()
  const [result, setResult] = useState<{ publicKey: string; privatePath: string; publicPath: string } | null>(null)
  const [viewKey, setViewKey] = useState<SshKeyStatus | null>(null)
  const [configTarget, setConfigTarget] = useState<SshKeyStatus | null>(null)
  const [configForm] = Form.useForm<{ host: string; user?: string }>()
  const [configBusy, setConfigBusy] = useState(false)
  const [cfgModalOpen, setCfgModalOpen] = useState(false)
  const [cfgText, setCfgText] = useState('')
  const [removeHost, setRemoveHost] = useState('')
  const [cfgBusy, setCfgBusy] = useState(false)
  const [commentTarget, setCommentTarget] = useState<SshKeyStatus | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ok, ks] = await Promise.all([window.gitSwitch.ssh.detect(), window.gitSwitch.ssh.listKeys()])
      setSshOk(ok)
      setKeys(ks)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const copy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      messageApi.success(`${label}${t('已复制', 'copied')}`)
    } catch {
      messageApi.error(t('复制失败', 'Copy failed'))
    }
  }

  const doGenerate = async (): Promise<void> => {
    const v = await genForm.validateFields()
    setGenerating(true)
    try {
      const r = await window.gitSwitch.ssh.generate(v.type, v.comment, v.fileName)
      setResult(r)
      genForm.resetFields()
      await load()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const doConfigure = async (): Promise<void> => {
    if (!configTarget) return
    const v = await configForm.validateFields()
    setConfigBusy(true)
    try {
      await window.gitSwitch.ssh.configureHost(v.host, { user: v.user || undefined, identityFile: configTarget.privatePath })
      messageApi.success(t('已写入 ssh config，新的 SSH 连接将自动使用该密钥', 'ssh config written; new SSH connections will use this key'))
      setConfigTarget(null)
      configForm.resetFields()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setConfigBusy(false)
    }
  }

  const openCfgManager = async (): Promise<void> => {
    setCfgBusy(true)
    setCfgModalOpen(true)
    try {
      setCfgText(await window.gitSwitch.ssh.readConfig())
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setCfgBusy(false)
    }
  }

  const doRemoveHost = async (): Promise<void> => {
    const host = removeHost.trim()
    if (!host) {
      messageApi.error(t('请输入要删除的 Host', 'Enter the Host to remove'))
      return
    }
    setCfgBusy(true)
    try {
      setCfgText(await window.gitSwitch.ssh.removeHost(host))
      setRemoveHost('')
      messageApi.success(t('已删除 Host 块', 'Host block removed'))
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setCfgBusy(false)
    }
  }

  const doChangeComment = async (): Promise<void> => {
    if (!commentTarget) return
    const c = commentDraft.trim()
    if (!c) {
      messageApi.error(t('备注不能为空', 'Comment is required'))
      return
    }
    setCommentBusy(true)
    try {
      const r = await window.gitSwitch.ssh.changeComment(commentTarget.privatePath, c)
      messageApi.success(`${t('备注已更新，原密钥已备份到', 'Comment updated; original key backed up to')} ${r.backupPath}`)
      setCommentTarget(null)
      setCommentDraft('')
      void load()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setCommentBusy(false)
    }
  }

  const previewLines = (): string[] => {
    const host = configForm.getFieldValue('host') || 'github.com'
    const user = configForm.getFieldValue('user')
    const idFile = configTarget?.privatePath ?? ''
    const lines = [`Host ${host}`, `    HostName ${host}`]
    if (user) lines.push(`    User ${user}`)
    lines.push(`    IdentityFile ${idFile}`, '    IdentitiesOnly yes')
    return lines
  }

  return (
    <div className="page">
      {contextHolder}
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        {t(
          '管理 SSH 密钥：一键生成密钥对并落盘到 ~/.ssh，复制公钥到 GitHub / GitLab，可选写入 ssh config 让指定 host 自动使用该密钥。',
          'Manage SSH keys: generate a key pair to ~/.ssh, copy the public key to GitHub / GitLab, and optionally write ssh config so a host uses this key automatically.'
        )}
      </Typography.Paragraph>

      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 860 }}>
        {sshOk === false && (
          <Alert
            type="warning"
            showIcon
            message={t('未检测到 ssh-keygen', 'ssh-keygen not found')}
            description={t(
              '请启用 Windows OpenSSH 客户端：设置 → 应用 → 可选功能 → 添加功能 → OpenSSH 客户端，启用后重启本应用。',
              'Enable Windows OpenSSH Client: Settings → Apps → Optional features → Add a feature → OpenSSH Client, then restart this app.'
            )}
          />
        )}

        {/* ---------- 已有密钥 ---------- */}
        <Card className="glass" title={t('已有密钥', 'Existing keys')} extra={<Button size="small" icon={<RefreshCw size={13} />} onClick={() => void load()} />}>
          <Table<SshKeyStatus>
            rowKey="fileName"
            size="small"
            loading={loading}
            dataSource={keys}
            pagination={false}
            locale={{ emptyText: <Empty description={t('还没有 SSH 密钥，在下方生成一个', 'No SSH keys yet — generate one below')} /> }}
            columns={[
              {
                title: t('文件名', 'File'),
                dataIndex: 'fileName',
                render: (v: string) => <Typography.Text code>{v}</Typography.Text>
              },
              {
                title: t('类型', 'Type'),
                dataIndex: 'type',
                width: 110,
                render: (v: SshKeyStatus['type']) => <Tag color={v === 'ed25519' ? 'blue' : v === 'rsa' ? 'green' : 'default'}>{TYPE_LABEL[v]}</Tag>
              },
              {
                title: t('指纹', 'Fingerprint'),
                dataIndex: 'fingerprint',
                render: (v?: string) => <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{maskFingerprint(v)}</Typography.Text>
              },
              {
                title: t('注释', 'Comment'),
                dataIndex: 'comment',
                render: (v?: string) => v ?? '—'
              },
              {
                title: t('操作', 'Actions'),
                width: 380,
                render: (_, k) => (
                  <Space size={4} wrap>
                    <Button size="small" icon={<Copy size={13} />} disabled={!k.publicKey} onClick={() => void copy(k.publicKey ?? '', k.fileName)}>
                      {t('复制公钥', 'Copy pub')}
                    </Button>
                    <Button size="small" icon={<Eye size={13} />} disabled={!k.publicKey} onClick={() => setViewKey(k)}>
                      {t('查看', 'View')}
                    </Button>
                    <Button size="small" icon={<Pencil size={13} />} onClick={() => { setCommentTarget(k); setCommentDraft(k.comment ?? '') }}>
                      {t('改备注', 'Edit')}
                    </Button>
                    <Button size="small" icon={<Settings2 size={13} />} onClick={() => { setConfigTarget(k); configForm.setFieldsValue({ host: 'github.com', user: 'git' }) }}>
                      {t('配置 ssh config', 'ssh config')}
                    </Button>
                  </Space>
                )
              }
            ]}
          />
        </Card>

        {/* ---------- 生成密钥 ---------- */}
        <Card className="glass" title={t('生成密钥对', 'Generate key pair')}>
          <Form
            form={genForm}
            layout="inline"
            initialValues={{ type: 'ed25519' }}
            onFinish={() => void doGenerate()}
            style={{ rowGap: 12 }}
          >
            <Form.Item name="type" label={t('类型', 'Type')}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'ed25519', label: 'ed25519（推荐）' },
                  { value: 'rsa', label: 'RSA 4096' }
                ]}
              />
            </Form.Item>
            <Form.Item name="fileName" label={t('文件名', 'File')}>
              <Input placeholder="id_ed25519" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="comment" label={t('注释', 'Comment')}>
              <Input placeholder="user@host（默认）" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<Plus size={14} />} loading={generating} disabled={sshOk === false}>
                {t('生成并落盘', 'Generate')}
              </Button>
            </Form.Item>
          </Form>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            {t(
              '生成到 ~/.ssh/ 下（无密码短语）；若同名文件已存在会拒绝生成以防覆盖。生成后可复制公钥添加到 GitHub / GitLab。',
              'Generated into ~/.ssh (no passphrase). Existing files are never overwritten. Copy the public key to GitHub / GitLab afterwards.'
            )}
          </Typography.Paragraph>
        </Card>

        {/* ---------- ssh config 管理 ---------- */}
        <Space>
          <Button icon={<Settings2 size={14} />} onClick={() => void openCfgManager()}>
            {t('管理 ssh config', 'Manage ssh config')}
          </Button>
        </Space>
      </Space>

      {/* ---------- 生成结果 ---------- */}
      <Modal
        open={result !== null}
        title={t('密钥已生成', 'Key generated')}
        onCancel={() => setResult(null)}
        footer={[
          <Button key="copy" type="primary" icon={<Copy size={14} />} onClick={() => void copy(result?.publicKey ?? '', t('公钥', 'Public key'))}>
            {t('复制公钥', 'Copy public key')}
          </Button>,
          <Button key="close" onClick={() => setResult(null)}>
            {t('关闭', 'Close')}
          </Button>
        ]}
      >
        {result && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('私钥', 'Private key')}: <Typography.Text code>{result.privatePath}</Typography.Text>
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('公钥', 'Public key')}: <Typography.Text code>{result.publicPath}</Typography.Text>
            </Typography.Text>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t(
                '把下面的公钥完整复制，添加到 GitHub（Settings → SSH and GPG keys → New SSH key）或 GitLab（Preferences → SSH Keys）。',
                'Copy the public key below and add it to GitHub (Settings → SSH and GPG keys → New SSH key) or GitLab (Preferences → SSH Keys).'
              )}
            </Typography.Paragraph>
            <Typography.Text
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, wordBreak: 'break-all', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 8 }}
            >
              {result.publicKey}
            </Typography.Text>
            <Button
              icon={<Settings2 size={14} />}
              onClick={() => {
                const target = keys.find((k) => k.publicPath === result.publicPath)
                if (target) {
                  setConfigTarget(target)
                  configForm.setFieldsValue({ host: 'github.com', user: 'git' })
                }
                setResult(null)
              }}
            >
              {t('顺便配置 ssh config…', 'Also configure ssh config…')}
            </Button>
          </Space>
        )}
      </Modal>

      {/* ---------- 查看公钥 ---------- */}
      <Modal open={viewKey !== null} title={`${viewKey?.fileName ?? ''} — ${t('公钥', 'Public key')}`} onCancel={() => setViewKey(null)} footer={<Button onClick={() => setViewKey(null)}>{t('关闭', 'Close')}</Button>}>
        {viewKey?.publicKey ? (
          <Typography.Text
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, wordBreak: 'break-all', display: 'block', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 8 }}
          >
            {viewKey.publicKey}
          </Typography.Text>
        ) : (
          <Empty description={t('公钥不存在', 'Public key missing')} />
        )}
      </Modal>

      {/* ---------- 配置 ssh config ---------- */}
      <Modal
        open={configTarget !== null}
        title={`${t('配置 ssh config', 'Configure ssh config')} — ${configTarget?.fileName || ''}`}
        onCancel={() => { setConfigTarget(null); configForm.resetFields() }}
        onOk={() => void doConfigure()}
        okText={t('写入', 'Write')}
        cancelText={t('取消', 'Cancel')}
        confirmLoading={configBusy}
      >
        <Form form={configForm} layout="vertical" initialValues={{ host: 'github.com', user: 'git' }}>
          <Form.Item name="host" label="Host" rules={[{ required: true, message: t('请输入 Host（如 github.com）', 'Host is required (e.g. github.com)') }]}>
            <Input placeholder="github.com" />
          </Form.Item>
          <Form.Item name="user" label="User">
            <Input placeholder="git" />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
          {t('将写入以下内容（已存在同 Host 块则幂等更新，不覆盖其它配置）：', 'The following will be written (idempotent update, other config preserved):')}
        </Typography.Text>
        <Typography.Text
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, display: 'block', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 8, whiteSpace: 'pre-line' }}
        >
          {previewLines().join('\n')}
        </Typography.Text>
      </Modal>

      {/* ---------- 修改备注 ---------- */}
      <Modal
        open={commentTarget !== null}
        title={`${commentTarget?.fileName ?? ''} — ${t('修改备注', 'Edit comment')}`}
        onCancel={() => { setCommentTarget(null); setCommentDraft('') }}
        onOk={() => void doChangeComment()}
        okText={t('保存', 'Save')}
        cancelText={t('取消', 'Cancel')}
        confirmLoading={commentBusy}
      >
        <Input.TextArea
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          placeholder="user@host"
          maxLength={200}
          showCount
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
          {t(
            '将更新私钥内嵌备注并重新生成公钥；修改前自动备份原私钥（备份文件可手动删除）。',
            'Updates the embedded comment and regenerates the public key; the original private key is backed up first (backup file can be deleted manually).'
          )}
        </Typography.Paragraph>
      </Modal>

      {/* ---------- 管理 ssh config ---------- */}
      <Modal
        open={cfgModalOpen}
        title={t('管理 ssh config', 'Manage ssh config')}
        onCancel={() => setCfgModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCfgModalOpen(false)}>
            {t('关闭', 'Close')}
          </Button>
        ]}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder={t('要删除的 Host，如 github.com', 'Host to remove, e.g. github.com')} value={removeHost} onChange={(e) => setRemoveHost(e.target.value)} />
            <Button danger loading={cfgBusy} onClick={() => void doRemoveHost()}>
              {t('删除 Host 块', 'Remove host')}
            </Button>
          </Space.Compact>
          <Typography.Text
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, display: 'block', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 8, whiteSpace: 'pre', maxHeight: 280, overflow: 'auto' }}
          >
            {cfgText || t('（config 为空）', '(config is empty)')}
          </Typography.Text>
        </Space>
      </Modal>
    </div>
  )
}
