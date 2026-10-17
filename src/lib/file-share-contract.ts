export type FileShareStatus = 'active' | 'expired' | 'exhausted' | 'deleted'

export interface FileShareMetadata {
  id: string
  status: FileShareStatus
  hasPassword: boolean
  expiresAt: string
  downloadsRemaining: number | null
  fileName?: string
  size?: number
}

export interface CreatedFileShare {
  id: string
  url: string
  expiresAt: string
  downloadLimit: number | null
}
