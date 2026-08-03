import { Card, Empty, Typography } from 'antd'

export default function BackupsPage(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          备份与回滚
        </Typography.Title>
        <Typography.Text type="secondary">Backups</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        每次切换/写入前自动备份配置文件，可随时回滚到任意备份点，附操作日志。
      </Typography.Paragraph>
      <Card className="glass">
        <Empty description="M1 开发中：备份历史与一键回滚即将上线" />
      </Card>
    </div>
  )
}
