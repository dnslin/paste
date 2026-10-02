'use client'

import { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ApiResponse } from '@/lib/api-response'
import type { PasteStatus } from '@/lib/paste'

interface PasteDetail {
  id: string
  content: string
  language: string
  createdAt: string
  expiresAt: string | null
  burnCount: number | null
  status: PasteStatus
  hasPassword: boolean
}

interface PasteDetailModalProps {
  pasteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; paste: PasteDetail }
  | { status: 'error'; message: string }

function PasteDetails({ pasteId }: { pasteId: string }) {
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetail() {
      try {
        const res = await fetch(`/api/admin/pastes/${pasteId}`, { signal: controller.signal })
        const result: ApiResponse<PasteDetail> = await res.json()
        if (controller.signal.aborted) return
        setState(result.success
          ? { status: 'success', paste: result.data }
          : { status: 'error', message: result.error.message })
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error', message: '无法加载详情，请重试。' })
      }
    }

    loadDetail()
    return () => controller.abort()
  }, [pasteId, attempt])

  if (state.status === 'loading') {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-8 text-(--text-secondary)">
        <Loader2 className="size-6 motion-safe:animate-spin" aria-hidden="true" />
        正在加载详情…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-red-500">{state.message}</p>
        <Button variant="outline" onClick={() => {
          setState({ status: 'loading' })
          setAttempt((value) => value + 1)
        }}>重试</Button>
      </div>
    )
  }

  const { paste } = state
  const statusLabel = { active: '可访问', expired: '已过期', destroyed: '查看次数已用尽' }[paste.status]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-(--text-secondary)">编号</dt>
          <dd className="font-mono text-(--text-primary)">{paste.id}</dd>
        </div>
        <div>
          <dt className="text-(--text-secondary)">语言</dt>
          <dd className="text-(--text-primary)">{paste.language}</dd>
        </div>
        <div>
          <dt className="text-(--text-secondary)">创建时间</dt>
          <dd className="text-(--text-primary)">{new Date(paste.createdAt).toLocaleString('zh-CN')}</dd>
        </div>
        <div>
          <dt className="text-(--text-secondary)">状态</dt>
          <dd className="text-(--text-primary)">{statusLabel}</dd>
        </div>
        {paste.expiresAt && (
          <div>
            <dt className="text-(--text-secondary)">过期时间</dt>
            <dd className="text-(--text-primary)">{new Date(paste.expiresAt).toLocaleString('zh-CN')}</dd>
          </div>
        )}
        {paste.burnCount !== null && (
          <div>
            <dt className="text-(--text-secondary)">剩余查看次数</dt>
            <dd className="text-(--text-primary)">{paste.burnCount}</dd>
          </div>
        )}
      </dl>
      <div>
        <h3 className="text-(--text-secondary) text-sm mb-2">内容</h3>
        <pre className="bg-(--bg-base) border border-(--border-subtle) rounded-lg p-4 overflow-auto max-h-75 text-sm font-mono text-(--text-primary)">{paste.content}</pre>
      </div>
    </div>
  )
}

export function PasteDetailModal({ pasteId, open, onOpenChange }: PasteDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl bg-(--bg-surface) motion-reduce:animate-none">
        <DialogHeader>
          <DialogTitle>分享详情</DialogTitle>
          <DialogDescription>查看这条分享的内容、状态与访问选项。</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-4 right-4 rounded-sm p-1 text-(--text-secondary) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
            aria-label="关闭详情"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </DialogClose>
        {open && pasteId ? <PasteDetails key={pasteId} pasteId={pasteId} /> : null}
      </DialogContent>
    </Dialog>
  )
}
