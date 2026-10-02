'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Clock, FileX, AlertCircle } from 'lucide-react'
import { PasteAccessForm, type PasteContent } from './paste-access-form'
import { CopyButton } from './copy-button'
import { CodeDisplay } from './code-display'
import { getLanguageName } from '@/lib/languages'

interface PasteViewerProps {
  pasteId: string
  initialStatus: 'active' | 'expired' | 'destroyed' | 'not_found' | 'error'
  hasPassword: boolean
  language: string
  burnCount: number | null
  initialContent?: string
}

const unavailable = {
  not_found: { icon: FileX, title: '内容不存在', description: '链接无效，或内容已被删除。' },
  expired: { icon: Clock, title: '内容已过期', description: '这条内容已停止公开访问。' },
  destroyed: { icon: Flame, title: '查看次数已用完', description: '这条内容已停止公开访问。' },
  error: { icon: AlertCircle, title: '暂时无法读取内容', description: '服务发生错误，请稍后刷新页面重试。' },
}

export function PasteViewer({ pasteId, initialStatus, hasPassword, language, burnCount, initialContent }: PasteViewerProps) {
  const [paste, setPaste] = useState<PasteContent | null>(initialContent === undefined ? null : { content: initialContent, language, remainingViews: burnCount })
  const [wrap, setWrap] = useState(false)

  if (initialStatus !== 'active') {
    const { icon: Icon, title, description } = unavailable[initialStatus]
    return <div className="flex min-h-100 flex-col items-center justify-center gap-3 text-center" role="status">
      <Icon className="size-12 text-(--text-secondary)" aria-hidden="true" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-(--text-secondary)">{description}</p>
      <Link href="/" className="mt-2 text-(--accent-primary) underline underline-offset-4">返回首页</Link>
    </div>
  }

  return <div className="space-y-4">
    <Link href="/" className="inline-block text-sm text-(--accent-primary) underline underline-offset-4">返回首页</Link>
    {paste ? <>
      {paste.remainingViews !== null ? <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
        {paste.remainingViews === 0 ? '这是最后一次查看。此后将停止公开访问，当前页面仍可阅读和复制。' : `还可查看 ${paste.remainingViews} 次，次数用完后停止公开访问。`}
      </p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-(--text-secondary)">{getLanguageName(paste.language)}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-(--text-secondary)"><input type="checkbox" checked={wrap} onChange={(event) => setWrap(event.target.checked)} />长行换行</label>
          <CopyButton content={paste.content} />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--bg-surface) py-4"><CodeDisplay code={paste.content} language={paste.language} wrap={wrap} /></div>
    </> : <PasteAccessForm pasteId={pasteId} hasPassword={hasPassword} burnCount={burnCount} onSuccess={setPaste} />}
  </div>
}
