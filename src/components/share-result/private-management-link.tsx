'use client'

import { ArrowUpRight, Check, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/components/paste/use-clipboard'

export function PrivateManagementLink({ url }: { url: string }) {
  const { copy, status } = useClipboard(url)

  return <section aria-label="私人管理链接" className="space-y-3 border-t border-(--border-subtle) pt-4">
    <h3 className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-(--accent-primary)" aria-hidden="true" />私人管理链接</h3>
    <p className="text-xs leading-6 text-(--text-secondary)">自行保存。持有此链接即可撤销分享，请勿发给接收者。丢失后无法自行找回。</p>
    <a href={url} className="block break-all rounded-lg border border-(--border-subtle) bg-(--bg-base) p-3 font-mono text-xs leading-5 text-(--text-secondary) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-(--accent-primary)">{url}</a>
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" onClick={() => void copy()} className="h-11 gap-2">
        {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {status === 'copied' ? '管理链接已复制' : '复制管理链接'}
      </Button>
      <Button variant="ghost" asChild className="h-11"><a href={url}>进入管理页<ArrowUpRight className="size-4" aria-hidden="true" /></a></Button>
    </div>
    {status === 'error'
      ? <p role="alert" className="text-xs leading-6 text-red-400">浏览器拒绝了复制，请重试或手动复制管理链接。</p>
      : <p role="status" className="sr-only">{status === 'copied' ? '管理链接已复制到剪贴板。' : ''}</p>}
  </section>
}
