import { Card, Empty, Typography } from 'antd'

export default function ProjectsPage(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          项目配置
        </Typography.Title>
        <Typography.Text type="secondary">Local scope</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        选择任意 Git 仓库，查看/编辑其 local scope 配置，或将配置集应用到该项目。
      </Typography.Paragraph>
      <Card className="glass">
        <Empty description="M1 开发中：仓库选择与项目级配置编辑即将上线" />
      </Card>
    </div>
  )
}
