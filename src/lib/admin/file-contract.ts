import type { FileShareStatus } from '@/lib/file-share-contract'

export interface AdminFileItem {
  id: string
  fileName: string
  size: number
  createdAt: string
  expiresAt: string
  downloadsRemaining: number | null
  hasPassword: boolean
  status: FileShareStatus
  cleanupStatus: 'active' | 'pending_delete' | 'delete_failed'
}

export interface AdminFilesResponse {
  items: AdminFileItem[]
  total: number
  page: number
  totalPages: number
  pageSize: number
  storage: { usedBytes: number; reservedBytes: number; limitBytes: number }
}
