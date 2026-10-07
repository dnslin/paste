'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'

interface DeleteConfirmModalProps {
  kind?: 'text' | 'file'
  pasteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteConfirmModal({ pasteId, open, onOpenChange, onConfirm, kind = 'text' }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!pasteId || loading) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pastes/${pasteId}`, { method: 'DELETE' })
      const data: ApiResponse<{ message: string }> = await res.json()
      if (data.success) {
        onConfirm()
        onOpenChange(false)
      } else {
        setError(data.error.message)
      }
    } catch {
      setError('删除失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (loading) return
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md bg-(--bg-surface) motion-reduce:animate-none">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
            </div>
            <DialogTitle>{kind === 'file' ? '撤销文件分享' : '删除分享'}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {kind === 'file' ? '确认撤销这条文件分享？新的下载请求将被拒绝，已开始的下载可完成。文件会进入清理，操作无法恢复。' : '确认删除这条分享？删除后无法恢复。'}
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <button
            type="button"
            disabled={loading}
            className="absolute top-4 right-4 rounded-sm p-1 text-(--text-secondary) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50"
            aria-label="关闭删除确认"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </DialogClose>
        
        {error && (
          <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 motion-safe:animate-spin mr-2" aria-hidden="true" />
                正在删除…
              </>
            ) : (
              kind === 'file' ? '撤销并删除' : '删除'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
