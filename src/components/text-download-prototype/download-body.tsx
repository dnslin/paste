'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeDisplay } from '@/components/paste/code-display'
import { CopyButton } from '@/components/paste/copy-button'
import { getLanguageName } from '@/lib/languages'
import { pasteId, type Example } from './model'

export function DownloadBody({ example }: { example: Example }) {
  const [wrap, setWrap] = useState(false)
  const [feedback, setFeedback] = useState<'idle' | 'started' | 'error'>('idle')
  const objectUrl = useRef<string | null>(null)
  const fileName = `paste-${pasteId}.${example.extension}`

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
  }, [])

  function download() {
    try {
      const blob = new Blob([example.content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = url
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      try { anchor.click() } finally { anchor.remove() }
      setFeedback('started')
    } catch {
      setFeedback('error')
    }
  }

  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <span className="text-sm text-(--text-secondary)">{getLanguageName(example.language)}</span>
      <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-(--text-secondary)">
          <input type="checkbox" checked={wrap} onChange={(event) => setWrap(event.target.checked)} className="accent-(--accent-primary)" />长行换行
        </label>
        <CopyButton content={example.content} className="size-11 motion-reduce:transition-none" />
        <Button variant="outline" onClick={download} className="min-h-11 motion-reduce:transition-none">
          <Download className="size-4" aria-hidden="true" />下载原文
        </Button>
      </div>
    </div>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-(--text-secondary)">
      <span className="font-mono [overflow-wrap:anywhere]">{fileName}</span>
      <span>UTF-8 · 保留原始格式</span>
    </div>
    <div className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--bg-surface) py-4">
      <CodeDisplay code={example.content} language={example.language} wrap={wrap} />
    </div>
    <p className="text-xs text-(--text-secondary)">下载当前正文，不额外消耗查看次数。</p>
    {feedback === 'error' ? <p role="alert" className="text-sm text-red-400">下载未能发起，请重试。也可以复制当前正文。</p> : null}
    <p role="status" aria-label="下载状态" className="text-sm text-(--text-secondary)">
      {feedback === 'started' ? `已发起下载 · ${fileName}` : ''}
    </p>
  </div>
}
