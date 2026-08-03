import { Card, Empty, Typography } from 'antd'

export default function EffectiveViewPage(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page-title">
        <Typography.Title level={3} style={{ margin: 0 }}>
          生效值
        </Typography.Title>
        <Typography.Text type="secondary">Effective values</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        system / global / local / includeIf 多层叠加后的最终生效配置，点击可下钻查看覆盖链。
      </Typography.Paragraph>
      <Card className="glass">
        <Empty description="M1 开发中：生效值对照面板即将上线" />
      </Card>
    </div>
  )
}
