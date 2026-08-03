import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Steps, Switch, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons'

interface OnboardingForm {
  profileName: string
  userName: string
  userEmail: string
  signingKey?: string
  gpgSign: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function OnboardingModal({ open, onClose }: Props): React.JSX.Element {
  const [current, setCurrent] = useState(0)
  const [gitState, setGitState] = useState<{ found: boolean; version?: string } | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [applyNow, setApplyNow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm<OnboardingForm>()
  const [messageApi, contextHolder] = message.useMessage()

  const checkGit = useCallback(async (): Promise<void> => {
    setGitState(null)
    try {
      const [found, version] = await Promise.all([window.gitSwitch.git.find(), window.gitSwitch.git.version()])
      setGitState({ found: !!found, version })
    } catch {
      setGitState({ found: false })
    }
  }, [])

  useEffect(() => {
    if (open) {
      form.resetFields()
      setCurrent(0)
      setProfileId(null)
      void checkGit()
    }
  }, [open, form, checkGit])

  const createIdentity = async (): Promise<void> => {
    const v = await form.validateFields()
    setBusy(true)
    try {
      const items: { key: string; value: string }[] = [
        { key: 'user.name', value: v.userName.trim() },
        { key: 'user.email', value: v.userEmail.trim() }
      ]
      if (v.signingKey?.trim()) items.push({ key: 'user.signingkey', value: v.signingKey.trim() })
      if (v.gpgSign) items.push({ key: 'commit.gpgsign', value: 'true' })
      const p = await window.gitSwitch.profiles.create({ name: v.profileName.trim(), items })
      setProfileId(p.id)
      setCurrent(2)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const finish = async (): Promise<void> => {
    setBusy(true)
    try {
      if (applyNow && profileId) {
        await window.gitSwitch.profiles.applyGlobal(profileId)
      }
      await window.gitSwitch.onboarding.markDone()
      messageApi.success(applyNow ? '设置完成，已应用到全局' : '设置完成')
      onClose()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const footer = (
    <Space>
      {current > 0 && (
        <Button onClick={() => setCurrent(current - 1)} disabled={busy}>
          上一步
        </Button>
      )}
      {current === 0 && (
        <Button type="primary" disabled={gitState?.found !== true} onClick={() => setCurrent(1)}>
          下一步
        </Button>
      )}
      {current === 1 && (
        <Button type="primary" loading={busy} onClick={() => void createIdentity()}>
          创建配置集
        </Button>
      )}
      {current === 2 && (
        <Button type="primary" loading={busy} onClick={() => void finish()}>
          完成
        </Button>
      )}
    </Space>
  )

  return (
    <Modal
      title={
        <Space>
          <span className="gradient-text">欢迎使用 Git Switch</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={footer}
      width={620}
      closable={false}
      maskClosable={false}
      destroyOnHidden
    >
      {contextHolder}
      <Steps
        current={current}
        size="small"
        style={{ margin: '8px 0 20px' }}
        items={[{ title: '环境检查' }, { title: '创建配置集' }, { title: '完成' }]}
      />

      {current === 0 && (
        <div>
          {gitState === null ? (
            <Typography.Text type="secondary">正在检测 Git 环境…</Typography.Text>
          ) : gitState.found ? (
            <Space direction="vertical" size={8}>
              <Space>
                <CheckCircleOutlined style={{ color: '#4ade80' }} />
                <Typography.Text>已检测到 Git</Typography.Text>
                <Tag color="cyan">{gitState.version}</Tag>
              </Space>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Git 环境正常，点击「下一步」创建你的第一个身份配置集。
              </Typography.Paragraph>
            </Space>
          ) : (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Alert
                type="warning"
                showIcon
                message="未检测到 Git"
                description="Git Switch 依赖 Git for Windows。请先安装后重试。"
              />
              <Space>
                <Button icon={<DownloadOutlined />} href="https://git-scm.com/download/win" target="_blank">
                  前往 git-scm.com 下载
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => void checkGit()}>
                  重新检测
                </Button>
              </Space>
            </Space>
          )}
        </div>
      )}

      {current === 1 && (
        <Form form={form} layout="vertical" initialValues={{ profileName: '', userName: '', userEmail: '', signingKey: '', gpgSign: false }}>
          <Form.Item name="profileName" label="配置集名称" rules={[{ required: true, message: '请输入配置集名称' }]}>
            <Input placeholder="如：我的身份" maxLength={40} />
          </Form.Item>
          <Form.Item name="userName" label="user.name（提交者姓名）" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="如：Zhang San" maxLength={80} />
          </Form.Item>
          <Form.Item name="userEmail" label="user.email（提交者邮箱）" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="如：zhangsan@example.com" maxLength={120} />
          </Form.Item>
          <Form.Item name="signingKey" label="user.signingkey（签名密钥，可选）">
            <Input placeholder="GPG 密钥指纹，可稍后在配置集中补充" maxLength={200} />
          </Form.Item>
          <Form.Item name="gpgSign" label="commit.gpgsign（提交签名）" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      )}

      {current === 2 && (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="success" showIcon message="配置集已创建" description="可以在「配置集」页面继续编辑、复制或创建更多身份。" />
          <Space>
            <Typography.Text>立即应用到全局？</Typography.Text>
            <Switch checked={applyNow} onChange={setApplyNow} />
            <Typography.Text type="secondary">应用前会自动备份当前全局配置，随时可回滚。</Typography.Text>
          </Space>
        </Space>
      )}
    </Modal>
  )
}
