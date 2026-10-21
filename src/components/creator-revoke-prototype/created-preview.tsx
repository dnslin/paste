'use client'

import { useState } from 'react'
import { ArrowUpRight, Ban, Check, Copy, KeyRound, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { demoPath, displayUrl, type PrototypeScreen, type ShareKind } from './model'
import { ShareSummary } from './share-summary'

function DemoLink({ kind, management = false, onNavigate }: { kind: ShareKind; management?: boolean; onNavigate: (screen: PrototypeScreen) => void }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const target = management ? 'manage' : 'receive'
  const label = management ? '管理链接' : '分享链接'
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(demoPath(kind, target), window.location.origin).href)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }
  return <div className="space-y-3">
    <a href={demoPath(kind, target)} onClick={(event) => { event.preventDefault(); onNavigate(target) }} className={`block break-all rounded-lg border border-(--border-subtle) bg-(--bg-base) p-3 font-mono text-xs leading-6 underline underline-offset-4 ${management ? 'text-(--text-secondary)' : 'text-(--accent-primary)'}`}>{displayUrl(kind, management)}</a>
    <div className="grid gap-3 sm:grid-cols-2">
      <Button type="button" variant={management ? 'outline' : 'default'} onClick={() => void copy()}>{status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{status === 'copied' ? `${label}已复制` : `复制${label}`}</Button>
      <Button type="button" variant={management ? 'ghost' : 'outline'} onClick={() => onNavigate(target)}>{management ? '进入管理页' : '预览接收者页面'}<ArrowUpRight aria-hidden="true" /></Button>
    </div>
    {status === 'error' ? <p role="alert" className="text-xs leading-6 text-red-400">浏览器拒绝了复制，请重试，或右键复制上方演示链接。</p> : <p role="status" className="sr-only">{status === 'copied' ? `演示${label}已复制。` : ''}</p>}
  </div>
}

export function CreatedPreview({ kind, revoked, onNavigate, onReset }: { kind: ShareKind; revoked: boolean; onNavigate: (screen: PrototypeScreen) => void; onReset: () => void }) {
  if (revoked) return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6">
    <Ban className="size-7 text-(--text-secondary)" aria-hidden="true" /><h2 className="text-xl font-semibold">分享已失效</h2>
    <p className="text-sm leading-6 text-(--text-secondary)">这条分享已撤销。原链接无法继续使用，需要重新创建分享。</p>
    <Button type="button" onClick={onReset}>创建新分享（重置演示）</Button>
  </section>
  return <section className="space-y-6 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6" aria-labelledby="created-title">
    <div className="flex items-center gap-3"><Check className="size-5 text-green-400" aria-hidden="true" /><h2 id="created-title" className="text-xl font-semibold">链接已生成</h2></div>
    <ShareSummary kind={kind} />
    <div className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-medium"><Link2 className="size-4" aria-hidden="true" />分享链接<span className="font-normal text-(--text-secondary)">发给接收者</span></h3><DemoLink key={`${kind}-public`} kind={kind} onNavigate={onNavigate} /></div>
    <div className="space-y-3 border-t border-(--border-subtle) pt-5">
      <h3 className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-(--accent-primary)" aria-hidden="true" />私人管理链接<span className="rounded border border-(--border-default) px-1.5 py-0.5 text-xs font-normal text-(--text-secondary)">自行保存</span></h3>
      <p className="text-sm leading-6 text-(--text-secondary)">持有此链接即可撤销分享，请勿发给接收者。仅在本次创建后提供，丢失后无法自行找回。</p>
      <DemoLink key={`${kind}-private`} kind={kind} management onNavigate={onNavigate} />
    </div>
    <Button type="button" variant="ghost" onClick={onReset} className="w-full">创建另一条（重置演示）</Button>
    <p className="text-xs leading-5 text-(--text-secondary)">上方为示例地址；复制和打开操作均进入此原型，不会生成真实链接。</p>
  </section>
}
