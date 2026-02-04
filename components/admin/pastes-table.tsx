'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from './pagination'
import { PasteDetailModal } from './paste-detail-modal'
import { DeleteConfirmModal } from './delete-confirm-modal'

interface PasteItem {
  id: string
  createdAt: string
  language: string
  status: string
  hasPassword: boolean
}

interface PastesResponse {
  items: PasteItem[]
  total: number
  page: number
  totalPages: number
}

export function PastesTable() {
  const [data, setData] = useState<PastesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const fetchPastes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/pastes?page=${page}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPastes()
  }, [fetchPastes])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleView = (id: string) => {
    setSelectedPasteId(id)
    setDetailModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setSelectedPasteId(id)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    fetchPastes()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-secondary)]">
        No pastes found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--bg-elevated)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Language</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.items.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--bg-elevated)]/50">
                <td className="px-4 py-3 font-mono text-sm text-[var(--text-primary)]">
                  {item.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                  {formatDate(item.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)] capitalize">
                  {item.language}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'expired' ? 'bg-zinc-500/20 text-zinc-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleView(item.id)}
                      aria-label="View paste"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-400"
                      aria-label="Delete paste"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      <PasteDetailModal
        pasteId={selectedPasteId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      <DeleteConfirmModal
        pasteId={selectedPasteId}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
