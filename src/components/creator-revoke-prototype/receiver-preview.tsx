'use client'

import { useState } from 'react'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { examples, type Scenario, type ShareKind } from './model'
import { ShareSummary } from './share-summary'

export function ReceiverPreview({ kind, scenario, revoked }: { kind: ShareKind; scenario: Scenario; revoked: boolean }) {
  const [claimed, setClaimed] = useState(false)
  const ended = revoked || scenario === 'expired' || scenario === 'exhausted'
  if (ended) return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6">
    <Ban className="size-7 text-(--text-secondary)" aria-hidden="true" /><h2 className="text-xl font-semibold">分享已失效</h2>
    <p className="text-sm leading-6 text-(--text-secondary)">内容可能已过期、被撤销或已结束领取。请联系分享者获取新的链接。</p>
  </section>
  return <section className="space-y-6 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6">
    <h2 className="text-xl font-semibold">{kind === 'text' ? '查看文本分享' : '接收文件分享'}</h2><ShareSummary kind={kind} />
    <Button type="button" onClick={() => setClaimed(true)}>{examples[kind].action}（模拟）</Button>
    {claimed ? <p role="status" className="text-sm leading-6 text-(--text-secondary)">这是交互演示，不会读取真实内容或下载文件。</p> : <p className="text-xs leading-6 text-(--text-secondary)">只有点击领取才会访问内容。接收者看不到私人管理链接。</p>}
  </section>
}
