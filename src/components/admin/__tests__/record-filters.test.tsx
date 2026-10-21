import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_RECORD_FILTERS, RecordFilters, recordFilterParams } from '../record-filters'

afterEach(cleanup)

describe('后台筛选表单', () => {
  it('草稿不立即查询，提交去除首尾空格，反向日期保留生效条件', () => {
    const onApply = vi.fn()
    render(<RecordFilters kind="text" value={EMPTY_RECORD_FILTERS} disabled={false} onApply={onApply} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' AbC ' } })
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.submit(screen.getByRole('search'))
    expect(onApply).toHaveBeenLastCalledWith({ ...EMPTY_RECORD_FILTERS, q: 'AbC' })
    fireEvent.change(screen.getByLabelText('创建开始日期'), { target: { value: '2026-10-21' } })
    fireEvent.change(screen.getByLabelText('创建结束日期'), { target: { value: '2026-10-20' } })
    fireEvent.submit(screen.getByRole('search'))
    expect(screen.getByRole('alert')).toHaveTextContent('开始日期不能晚于结束日期')
    expect(onApply).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    expect(onApply).toHaveBeenLastCalledWith(EMPTY_RECORD_FILTERS)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('文件提供全部状态，加载时禁用查询且保留草稿和生效条件', () => {
    const filters = { ...EMPTY_RECORD_FILTERS, q: '报告', status: 'delete_failed' }
    const { rerender } = render(<RecordFilters kind="file" value={filters} disabled={false} onApply={vi.fn()} />)
    expect(screen.getByRole('option', { name: '清理失败' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '下载次数用尽' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '新的草稿' } })
    rerender(<RecordFilters kind="file" value={filters} disabled onApply={vi.fn()} />)
    expect(screen.getByRole('button', { name: '查询' })).toBeDisabled()
    expect(screen.getByRole('searchbox')).toHaveValue('新的草稿')
    expect(screen.getByLabelText('当前生效条件')).toHaveTextContent('关键词：报告')
    expect(screen.getByLabelText('当前生效条件')).toHaveTextContent('状态：清理失败')
  })

  it('北京时间起止日期序列化为含开始、不含次日零点的时间戳，关键词按字面传递', () => {
    expect(recordFilterParams(EMPTY_RECORD_FILTERS).toString()).toBe('')
    const params = recordFilterParams({ q: 'AbC_100%', status: 'active', from: '2026-10-21', to: '2026-10-21' })
    expect(Object.fromEntries(params)).toEqual({ q: 'AbC_100%', status: 'active', createdFrom: '2026-10-20T16:00:00.000Z', createdBefore: '2026-10-21T16:00:00.000Z' })
    expect(recordFilterParams({ ...EMPTY_RECORD_FILTERS, to: '2026-12-31' }).get('createdBefore')).toBe('2026-12-31T16:00:00.000Z')
  })
})
