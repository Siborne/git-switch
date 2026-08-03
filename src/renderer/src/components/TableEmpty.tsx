import { Empty } from 'antd'
import { Inbox } from 'lucide-react'

interface Props {
  icon?: React.ReactNode
  description?: React.ReactNode
}

/** 表格内嵌空状态：品牌迷你图标 + 描述 */
export default function TableEmpty({ icon, description }: Props): React.JSX.Element {
  return (
    <Empty
      image={<span className="empty-mini-icon">{icon ?? <Inbox size={24} />}</span>}
      description={description}
    />
  )
}
