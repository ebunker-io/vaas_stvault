import React, { useCallback, useEffect } from 'react'
import { useState } from 'react'
interface Props {
  children: React.ReactNode
  text: string
  onCopy(text: string, result: boolean): void
}

const CopyToClipboard = (props: Props) => {
  const [text, setText] = useState<string>(props.text)

  useEffect(() => {
    if (props.text) {
      setText(props.text)
    }
  }, [props.text])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      props.onCopy(text, true)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }, [props, text])
  return <div className='inline-block' onClick={handleCopy}>{props.children}</div>
}

export default React.memo(CopyToClipboard)
