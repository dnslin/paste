'use client'

import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useClipboard } from './use-clipboard'

interface CopyButtonProps {
  content: string
  className?: string
}

export function CopyButton({ content, className }: CopyButtonProps) {
  const { status, copy } = useClipboard(content)
  return (
    <span className="inline-flex items-center gap-2">
      {status === 'error' ? <span role="alert" className="text-sm text-red-400">复制失败，请手动选择内容复制。</span> : null}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void copy()}
        className={cn(status === 'copied' && 'text-(--accent-primary)', className)}
        aria-label={status === 'copied' ? '已复制' : '复制内容'}
      >
        {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </Button>
      <span className="sr-only" role="status">{status === 'copied' ? '内容已复制' : ''}</span>
    </span>
  )
}
