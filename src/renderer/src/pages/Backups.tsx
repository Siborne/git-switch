import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, Modal, Popconfirm, Space, Spin, Table, Tag, Timeline, Typography, message } from 'antd'
import { Undo2, FileSearch, GitCompare } from 'lucide-react'
import type { TableProps } from 'antd'
import type { BackupMeta, DiffFileResult, LogEntry } from '../../../shared/types'
import { t } from '../lib/i18n'

const ACTION_LABEL: Record<string, string> = {
  'profile-create': '创建配置集',
  'profile-update': '更新配置集',
  'profile-delete': '删除配置集',
  'apply-global': '应用到全局',
  'apply-local': '应用到项目',
  restore: '回滚'
}

const ACTION_COLOR: Record<string, string> = {
  'profile-create': 'cyan',
  'profile-update': 'blue',
  'profile-delete': 'red',
  'apply-global': 'green',
  'apply-local': 'green',
  restore: 'orange'
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

export default function BackupsPage(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [viewFiles, setViewFiles] = useState<{ file: string; content: string }[] | null>(null)
  const [viewing, setViewing] = useState(false)
  const [diffFiles, setDiffFiles] = useState<DiffFileResult[] | null>(null)
  const [diffing, setDiffing] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [b, l] = await Promise.all([window.gitSwitch.backup.list(), window.gitSwitch.logs.list()])
      setBackups(b)
      setLogs(l)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const restore = async (meta: BackupMeta): Promise<void> => {
    setRestoring(meta.id)
    try {
      const r = await window.gitSwitch.backup.restore(meta.id)
      messageApi.success(`已回滚 ${r.restored.length} 个文件${r.protection ? '（回滚前状态已另存备份）' : ''}`)
      await load()
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRestoring(null)
    }
  }

  const viewContent = async (meta: BackupMeta): Promise<void> => {
    try {
      const files = await window.gitSwitch.backup.content(meta.id)
      setViewFiles(files)
      setViewing(true)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    }
  }

  const showDiff = async (meta: BackupMeta): Promise<void> => {
    setDiffing(true)
    try {
      const files = await window.gitSwitch.backup.diff(meta.id)
      setDiffFiles(files)
      setDiffOpen(true)
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : String(e))
    } finally {
      setDiffing(false)
    }
  }

  const columns: TableProps<BackupMeta>['columns'] = [
    {
      title: t('备份时间', 'Time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => <Typography.Text>{fmtTime(v)}</Typography.Text>
    },
    {
      title: t('原因', 'Reason'),
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string) => <Typography.Text>{v}</Typography.Text>
    },
    {
      title: t('文件', 'Files'),
      dataIndex: 'files',
      key: 'files',
      width: 300,
      render: (v: string[]) => (
        <Space size={[4, 4]} wrap>
          {v.map((f, i) => (
            <Tag key={i} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {f.split(/[\\/]/).pop()}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: t('操作', 'Actions'),
      key: 'actions',
      width: 210,
      render: (_, meta) => (
        <Space size={4}>
          <Button size="small" icon={<GitCompare size={13} />} loading={diffing} onClick={() => void showDiff(meta)}>
            对比
          </Button>
          <Button size="small" icon={<FileSearch size={13} />} onClick={() => void viewContent(meta)}>
            查看
          </Button>
          <Popconfirm
            title="回滚到此备份点？"
            description="当前配置会先自动备份，确保可再次回滚。"
            okText="回滚"
            onConfirm={() => void restore(meta)}
          >
            <Button size="small" icon={<Undo2 size={13} />} loading={restoring === meta.id}>
              回滚
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const timelineItems = logs.map((l) => ({
    key: `${l.ts}-${l.action}`,
    color: ACTION_COLOR[l.action] ?? 'gray',
    children: (
      <div>
        <Space size={8}>
          <Tag color={ACTION_COLOR[l.action] ?? 'default'} style={{ marginRight: 0 }}>
            {ACTION_LABEL[l.action] ?? l.action}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {fmtTime(l.ts)}
          </Typography.Text>
        </Space>
        {l.detail && (
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {l.detail}
            </Typography.Text>
          </div>
        )}
      </div>
    )
  }))

  return (
    <div className="page">
      {contextHolder}
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        每次切换/写入前自动备份配置文件，可随时回滚；回滚前也会保护当前状态，保证可逆。
      </Typography.Paragraph>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="glass" title={t('备份点', 'Restore Points')} styles={{ body: { padding: 8 } }}>
          <Spin spinning={loading}>
            <Table<BackupMeta>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={backups}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="暂无备份记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Spin>
        </Card>

        <Card className="glass" title={t('操作日志', 'Activity Log')} styles={{ body: { padding: '16px 24px' } }}>
          <Spin spinning={loading}>
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} style={{ maxHeight: 320, overflowY: 'auto' }} />
            ) : (
              <Empty description="暂无操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>
        </Card>
      </Space>

      {/* 查看备份内容 */}
      <Modal
        title="备份内容"
        open={viewing}
        onCancel={() => setViewing(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {(viewFiles ?? []).length === 0 && <Typography.Text type="secondary">该备份点没有可读取的文件内容</Typography.Text>}
          {(viewFiles ?? []).map((f, i) => (
            <div key={i}>
              <Typography.Text type="secondary" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {f.file}
              </Typography.Text>
              <pre
                style={{
                  margin: '6px 0 0',
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(11, 18, 32, 0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  maxHeight: 260,
                  overflow: 'auto',
                  color: 'rgba(255,255,255,0.78)'
                }}
              >
                {f.content}
              </pre>
            </div>
          ))}
        </Space>
      </Modal>

      {/* 对比差异 */}
      <Modal
        title="对比备份点与当前配置"
        open={diffOpen}
        onCancel={() => setDiffOpen(false)}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {(diffFiles ?? []).length === 0 && <Typography.Text type="secondary">没有可对比的文件</Typography.Text>}
          {(diffFiles ?? []).map((f, i) => (
            <div key={i}>
              <Space size={8} style={{ marginBottom: 6 }}>
                <Typography.Text style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{f.file}</Typography.Text>
                {!f.hasBackup && <Tag color="orange">备份缺失</Tag>}
                {!f.hasCurrent && <Tag color="red">当前已删除</Tag>}
                {f.added > 0 && (
                  <Tag style={{ color: '#4ade80', background: 'rgba(34,197,94,0.1)', marginRight: 0 }}>+{f.added}</Tag>
                )}
                {f.removed > 0 && (
                  <Tag style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', marginRight: 0 }}>-{f.removed}</Tag>
                )}
              </Space>
              <pre
                style={{
                  margin: 0,
                  padding: 0,
                  borderRadius: 10,
                  overflow: 'auto',
                  maxHeight: 300,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.7
                }}
              >
                {f.diff.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      background:
                        line.type === 'add' ? 'rgba(34,197,94,0.12)' : line.type === 'remove' ? 'rgba(239,68,68,0.12)' : 'transparent',
                      color: line.type === 'add' ? '#4ade80' : line.type === 'remove' ? '#f87171' : 'rgba(255,255,255,0.6)',
                      padding: '0 12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    {line.text.replace(/\n$/, '')}
                  </div>
                ))}
              </pre>
            </div>
          ))}
        </Space>
      </Modal>
    </div>
  )
}
