export type ShareKind = 'text' | 'file'
export type ShareManagementStatus = 'active' | 'expired' | 'exhausted'

interface ShareManagementInfo {
  id: string
  status: ShareManagementStatus
  createdAt: string
  expiresAt: string | null
  remaining: number | null
  hasPassword: boolean
}

export type ShareManagementMetadata = ShareManagementInfo & (
  | { kind: 'text'; language: string }
  | { kind: 'file'; fileName: string }
)
