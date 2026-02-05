'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PasteDetail {
  id: string
  content: string
  language: string
  createdAt: string
  expiresAt: string | null
  burnCount: number | null
  status: string
  hasPassword: boolean
}

interface PasteDetailModalProps {
  pasteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PasteDetailModal({ pasteId, open, onOpenChange }: PasteDetailModalProps) {
  const [data, setData] = useState<{ paste: PasteDetail | null; fetchedId: string | null }>({
    paste: null,
    fetchedId: null,
  })

  useEffect(() => {
    if (pasteId && open && data.fetchedId !== pasteId) {
      const controller = new AbortController()

      fetch(`/api/admin/pastes/${pasteId}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setData({ paste: result.data, fetchedId: pasteId })
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error(err)
          }
        })

      return () => controller.abort()
    }
  }, [pasteId, open, data.fetchedId])

  const loading = open && !!pasteId && data.fetchedId !== pasteId
  const paste = data.fetchedId === pasteId ? data.paste : null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-(--bg-surface)">
        <DialogHeader>
          <DialogTitle>Paste Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-(--text-secondary)" />
          </div>
        ) : paste ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-(--text-secondary)">ID</p>
                <p className="font-mono text-(--text-primary)">{paste.id}</p>
              </div>
              <div>
                <p className="text-(--text-secondary)">Language</p>
                <p className="text-(--text-primary) capitalize">{paste.language}</p>
              </div>
              <div>
                <p className="text-(--text-secondary)">Created</p>
                <p className="text-(--text-primary)">{formatDate(paste.createdAt)}</p>
              </div>
              <div>
                <p className="text-(--text-secondary)">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  paste.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  paste.status === 'expired' ? 'bg-zinc-500/20 text-zinc-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {paste.status}
                </span>
              </div>
              {paste.expiresAt && (
                <div>
                  <p className="text-(--text-secondary)">Expires</p>
                  <p className="text-(--text-primary)">{formatDate(paste.expiresAt)}</p>
                </div>
              )}
              {paste.burnCount !== null && (
                <div>
                  <p className="text-(--text-secondary)">Burn Count</p>
                  <p className="text-(--text-primary)">{paste.burnCount}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-(--text-secondary) text-sm mb-2">Content</p>
              <pre className="bg-(--bg-base) border border-(--border-subtle) rounded-lg p-4 overflow-auto max-h-75 text-sm font-mono text-(--text-primary)">
                {paste.content}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
