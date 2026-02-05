'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, Trash2, Loader2, AlertCircle } from 'lucide-react'
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
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const fetchPastes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pastes?page=${page}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error?.message || 'Failed to load pastes')
      }
    } catch {
      setError('Failed to load pastes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPastes()
  }, [fetchPastes])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
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
        <Loader2 className="w-6 h-6 animate-spin text-(--text-secondary)" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPastes}>
          Retry
        </Button>
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-(--text-secondary)">
        No pastes found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-(--border-subtle) overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-(--bg-elevated)">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary) hidden md:table-cell">Language</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-(--text-secondary)">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {data.items.map((item) => {
              const { date, time } = formatDate(item.createdAt)
              return (
              <tr key={item.id} className="hover:bg-(--bg-elevated)/50">
                <td className="px-4 py-3 font-mono text-sm text-(--text-primary)">
                  <span className="md:hidden">{item.id.slice(0, 4)}</span>
                  <span className="hidden md:inline">{item.id.slice(0, 8)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-(--text-primary)">
                  <span>{date}</span>
                  <span className="hidden md:inline"> {time}</span>
                </td>
                <td className="px-4 py-3 text-sm text-(--text-primary) capitalize hidden md:table-cell">
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
              )
            })}
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
