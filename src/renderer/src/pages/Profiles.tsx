import { Card, Empty, Typography } from 'antd'

export default function ProfilesPage(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          配置集
        </Typography.Title>
        <Typography.Text type="secondary">Profiles</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        管理多套 Git 身份与配置项（user.name / user.email / signingkey / proxy 等），一键应用到全局或指定项目。
      </Typography.Paragraph>
      <Card className="glass">
        <Empty description="M1 开发中：配置集 CRUD 即将上线" />
      </Card>
    </div>
  )
}
