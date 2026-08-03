import { Card, Empty, Typography } from 'antd'

export default function ConfigBrowserPage(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          配置浏览器
        </Typography.Title>
        <Typography.Text type="secondary">Config browser</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        浏览 system / global / local 三层的全部配置项，支持搜索、编辑与敏感项脱敏。
      </Typography.Paragraph>
      <Card className="glass">
        <Empty description="M1 开发中：配置浏览与编辑即将上线" />
      </Card>
    </div>
  )
}
