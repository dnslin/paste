import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD_FILTERS } from '@/components/admin/record-filters'
import { DEMO_RECORDS, filterRecords, type DemoRecord } from '../demo-data'

const records: DemoRecord[] = [
  { id: 'AbC123xy', kind: 'text', language: 'TypeScript', createdAt: '2026-10-21T02:00:00Z', status: 'active', hasPassword: false },
  { id: 'abc123xy', kind: 'text', language: 'JSON', createdAt: '2026-10-20T02:00:00Z', status: 'expired', hasPassword: true },
  { id: 'FileAbC1', kind: 'file', fileName: '交付说明_README.md', createdAt: '2026-10-21T03:00:00Z', status: 'active', hasPassword: false },
  { id: 'FileAbC2', kind: 'file', fileName: '交付说明_100%_完成.pdf', createdAt: '2026-10-20T03:00:00Z', status: 'delete_failed', hasPassword: true },
  { id: 'FileDef3', kind: 'file', fileName: '交付说明_100X_完成.pdf', createdAt: '2026-10-19T03:00:00Z', status: 'active', hasPassword: false },
]

describe('后台搜索原型数据', () => {
  it('同时满足类型、关键词、状态和创建日期条件', () => {
    const result = filterRecords(records, 'file', { q: '  交付说明  ', status: 'active', from: '2026-10-20', to: '2026-10-21' })
    expect(result.map((item) => item.id)).toEqual(['FileAbC1'])
  })

  it('ID 支持片段且区分大小写，文本不搜索语言字段', () => {
    expect(filterRecords(records, 'text', { ...EMPTY_RECORD_FILTERS, q: 'AbC' }).map((item) => item.id)).toEqual(['AbC123xy'])
    expect(filterRecords(records, 'text', { ...EMPTY_RECORD_FILTERS, q: 'abc' }).map((item) => item.id)).toEqual(['abc123xy'])
    expect(filterRecords(records, 'text', { ...EMPTY_RECORD_FILTERS, q: 'TypeScript' })).toEqual([])
  })

  it('文件可按 ID 或文件名查找，文件名英文不区分大小写', () => {
    expect(filterRecords(records, 'file', { ...EMPTY_RECORD_FILTERS, q: 'AbC1' }).map((item) => item.id)).toEqual(['FileAbC1'])
    expect(filterRecords(records, 'file', { ...EMPTY_RECORD_FILTERS, q: 'readme' }).map((item) => item.id)).toEqual(['FileAbC1'])
    expect(filterRecords(records, 'file', { ...EMPTY_RECORD_FILTERS, q: '交付说明' })).toHaveLength(3)
  })

  it('百分号与下划线按普通字符匹配', () => {
    expect(filterRecords(records, 'file', { ...EMPTY_RECORD_FILTERS, q: '100%_' }).map((item) => item.id)).toEqual(['FileAbC2'])
    expect(filterRecords(records, 'file', { ...EMPTY_RECORD_FILTERS, q: '100_完成' })).toEqual([])
  })

  it('创建日期采用北京时间，起止同日包含该日完整边界', () => {
    const boundaryRecords: DemoRecord[] = [
      { ...records[0], id: 'before', createdAt: '2026-10-20T15:59:59.999Z' },
      { ...records[0], id: 'start', createdAt: '2026-10-20T16:00:00Z' },
      { ...records[0], id: 'end', createdAt: '2026-10-21T15:59:59.999Z' },
      { ...records[0], id: 'after', createdAt: '2026-10-21T16:00:00Z' },
    ]
    expect(filterRecords(boundaryRecords, 'text', { ...EMPTY_RECORD_FILTERS, from: '2026-10-21', to: '2026-10-21' }).map((item) => item.id)).toEqual(['end', 'start'])
  })

  it('日期允许只填开始日或结束日', () => {
    expect(filterRecords(records, 'text', { ...EMPTY_RECORD_FILTERS, from: '2026-10-21' }).map((item) => item.id)).toEqual(['AbC123xy'])
    expect(filterRecords(records, 'text', { ...EMPTY_RECORD_FILTERS, to: '2026-10-20' }).map((item) => item.id)).toEqual(['abc123xy'])
  })

  it('没有条件时返回当前类型全部记录，按创建时间及 ID 倒序且不改写数据', () => {
    const input: DemoRecord[] = [
      { ...records[0], id: 'alpha', createdAt: '2026-10-21T02:00:00Z' },
      { ...records[0], id: 'latest', createdAt: '2026-10-21T11:00:00+08:00' },
      { ...records[0], id: 'zeta', createdAt: '2026-10-21T02:00:00Z' },
    ]
    expect(filterRecords(input, 'text', EMPTY_RECORD_FILTERS).map((item) => item.id)).toEqual(['latest', 'zeta', 'alpha'])
    expect(input.map((item) => item.id)).toEqual(['alpha', 'latest', 'zeta'])
  })

  it('示例数据覆盖两类多页记录及当前所有状态', () => {
    expect(DEMO_RECORDS.filter((item) => item.kind === 'text').length).toBeGreaterThanOrEqual(18)
    expect(DEMO_RECORDS.filter((item) => item.kind === 'file').length).toBeGreaterThanOrEqual(18)
    expect(new Set(DEMO_RECORDS.map((item) => item.status))).toEqual(new Set(['active', 'expired', 'destroyed', 'exhausted', 'pending_delete', 'delete_failed']))
    expect(DEMO_RECORDS.some((item) => (item.fileName?.length ?? 0) > 50)).toBe(true)
  })
})
