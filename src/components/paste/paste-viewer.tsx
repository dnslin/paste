'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Clock, FileX, AlertCircle } from 'lucide-react'
import { PasteAccessForm, type PasteContent } from './paste-access-form'
import { PasteBody } from './paste-body'

interface PasteViewerProps {
  pasteId: string
  initialStatus: 'active' | 'expired' | 'destroyed' | 'not_found' | 'error'
  hasPassword: boolean
  language: string
  burnCount: number | null
  initialContent?: string
}

const unavailable = {
  not_found: { icon: FileX, title: '分享已失效', description: '内容可能已过期、被撤销或已结束领取。' },
  expired: { icon: Clock, title: '内容已过期', description: null },
  destroyed: { icon: Flame, title: '查看次数已用完', description: null },
  error: { icon: AlertCircle, title: '暂时无法读取内容', description: '服务发生错误，请稍后刷新页面重试。' },
}

export function PasteViewer({ pasteId, initialStatus, hasPassword, language, burnCount, initialContent }: PasteViewerProps) {
  const [paste, setPaste] = useState<PasteContent | null>(initialContent === undefined ? null : { content: initialContent, language, remainingViews: burnCount })
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)

  if (initialStatus !== 'active' || unavailableMessage) {
    const { icon: Icon, title, description } = initialStatus === 'active'
      ? unavailable.not_found
      : unavailable[initialStatus]
    return <div className="flex min-h-100 flex-col items-center justify-center gap-3 text-center" role="status">
      <Icon className="size-12 text-(--text-secondary)" aria-hidden="true" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="text-(--text-secondary)">{description}</p> : null}
      {initialStatus !== 'error' ? <p className="text-sm text-(--text-secondary)">请联系分享者获取新链接。</p> : null}
      <Link href="/" className="mt-2 text-(--accent-primary) underline underline-offset-4">返回首页</Link>
    </div>
  }

  return <div className="space-y-4">
    <Link href="/" className="inline-block text-sm text-(--accent-primary) underline underline-offset-4">返回首页</Link>
    {paste ? <>
      {paste.remainingViews !== null ? <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
        {paste.remainingViews === 0 ? '这是最后一次查看，当前页面仍可阅读、复制和下载。' : `还可查看 ${paste.remainingViews} 次`}
      </p> : null}
      <PasteBody pasteId={pasteId} content={paste.content} language={paste.language} />
    </> : <PasteAccessForm pasteId={pasteId} hasPassword={hasPassword} burnCount={burnCount} onSuccess={setPaste} onUnavailable={setUnavailableMessage} />}
  </div>
}
