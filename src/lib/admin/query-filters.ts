import { and, eq, gt, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { pastes, fileShares } from '@/lib/db/schema'
import { ApiError, VALIDATION_ERROR } from '@/lib/api-response'

function parseTimestamp(value: string | null): Date | null {
  if (value === null) return null
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  const date = new Date(value)
  if (!parts || !Number.isFinite(date.getTime()) || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4]) > 59) {
    throw new ApiError(VALIDATION_ERROR, '创建日期必须是带时区的有效时间')
  }
  const calendarDate = new Date(`${parts[1]}T00:00:00Z`)
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== parts[1]) {
    throw new ApiError(VALIDATION_ERROR, '创建日期无效')
  }
  return date
}

export function buildAdminRecordFilter(params: URLSearchParams, kind: 'text' | 'file', now: Date): SQL | undefined {
  const q = (params.get('q') ?? '').trim()
  const status = params.get('status') ?? ''
  const statuses = kind === 'text' ? ['active', 'expired', 'destroyed'] : ['active', 'expired', 'exhausted', 'pending_delete', 'delete_failed']
  if (status && !statuses.includes(status)) throw new ApiError(VALIDATION_ERROR, '分享状态无效')
  const from = parseTimestamp(params.get('createdFrom'))
  const before = parseTimestamp(params.get('createdBefore'))
  if (from && before && from >= before) throw new ApiError(VALIDATION_ERROR, '创建开始时间必须早于结束时间')

  const table = kind === 'text' ? pastes : fileShares
  const conditions: (SQL | undefined)[] = []
  if (q) conditions.push(kind === 'text'
    ? sql`instr(${pastes.id}, ${q}) > 0`
    : or(sql`instr(${fileShares.id}, ${q}) > 0`, sql`instr(lower(${fileShares.fileName}), lower(${q})) > 0`))
  // SQLite stores integer seconds; bind fractional bounds without timestamp rounding.
  if (from) conditions.push(sql`${table.createdAt} >= ${from.getTime() / 1000}`)
  if (before) conditions.push(sql`${table.createdAt} < ${before.getTime() / 1000}`)

  if (status && kind === 'text') {
    const notExpired = or(isNull(pastes.expiresAt), gt(pastes.expiresAt, now))
    if (status === 'expired') conditions.push(lte(pastes.expiresAt, now))
    if (status === 'destroyed') conditions.push(and(notExpired, lte(pastes.burnCount, 0)))
    if (status === 'active') conditions.push(and(notExpired, or(isNull(pastes.burnCount), gt(pastes.burnCount, 0))))
  }
  if (status && kind === 'file') {
    if (status === 'pending_delete' || status === 'delete_failed') conditions.push(eq(fileShares.status, status))
    else {
      conditions.push(eq(fileShares.status, 'active'))
      if (status === 'expired') conditions.push(lte(fileShares.expiresAt, now))
      if (status === 'exhausted') conditions.push(and(gt(fileShares.expiresAt, now), lte(fileShares.downloadsRemaining, 0)))
      if (status === 'active') conditions.push(and(gt(fileShares.expiresAt, now), or(isNull(fileShares.downloadsRemaining), gt(fileShares.downloadsRemaining, 0))))
    }
  }
  return and(...conditions)
}
