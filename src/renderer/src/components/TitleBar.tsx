import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'

/** 自定义标题栏：拖动区 + 最小化/最大化/关闭到托盘（配合 frame:false） */
export default function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    return window.gitSwitch.windowControls.onMaximizedChange(setMaximized)
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-title">Git Switch</span>
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn" title="最小化" onClick={() => window.gitSwitch.windowControls.minimize()}>
          <Minus size={15} />
        </button>
        <button
          className="tb-btn"
          title={maximized ? '还原' : '最大化'}
          onClick={() => window.gitSwitch.windowControls.toggleMaximize()}
        >
          {maximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button className="tb-btn tb-close" title="关闭到托盘" onClick={() => window.gitSwitch.windowControls.hide()}>
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
