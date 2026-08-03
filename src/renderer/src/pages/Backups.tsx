import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, Popconfirm, Space, Spin, Table, Tag, Timeline, Typography, message } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import type { TableProps } from 'antd'
import type { BackupMeta, LogEntry } from '../../../shared/types'

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

  const columns: TableProps<BackupMeta>['columns'] = [
    {
      title: '备份时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => <Typography.Text>{fmtTime(v)}</Typography.Text>
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string) => <Typography.Text>{v}</Typography.Text>
    },
    {
      title: '文件',
      dataIndex: 'files',
      key: 'files',
      width: 300,
      render: (v: string[]) => (
        <Space size={[4, 4]} wrap>
          {v.map((f, i) => (
            <Tag key={i} style={{ fontFamily: 'Consolas, monospace' }}>
              {f.split(/[\\/]/).pop()}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, meta) => (
        <Popconfirm
          title="回滚到此备份点？"
          description="当前配置会先自动备份，确保可再次回滚。"
          okText="回滚"
          onConfirm={() => void restore(meta)}
        >
          <Button size="small" icon={<RollbackOutlined />} loading={restoring === meta.id}>
            回滚
          </Button>
        </Popconfirm>
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
            <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'Consolas, monospace' }}>
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
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          备份与回滚
        </Typography.Title>
        <Typography.Text type="secondary">Backups</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        每次切换/写入前自动备份配置文件，可随时回滚；回滚前也会保护当前状态，保证可逆。
      </Typography.Paragraph>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="glass" title="备份点" styles={{ body: { padding: 8 } }}>
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

        <Card className="glass" title="操作日志" styles={{ body: { padding: '16px 24px' } }}>
          <Spin spinning={loading}>
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} style={{ maxHeight: 320, overflowY: 'auto' }} />
            ) : (
              <Empty description="暂无操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>
        </Card>
      </Space>
    </div>
  )
}
