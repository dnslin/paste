import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchPrototype } from '../admin-search-prototype'
import { DEMO_RECORDS } from '../demo-data'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); HTMLElement.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function panel() { return within(screen.getByRole('tabpanel')) }
function switchTab(name: string) { fireEvent.keyDown(screen.getByRole('tab', { name }), { key: 'Enter' }) }
function search(value: string) {
  fireEvent.change(panel().getByRole('searchbox'), { target: { value } })
  fireEvent.click(panel().getByRole('button', { name: '查询' }))
}

describe('后台搜索原型', () => {
  it('查询全量记录后分页，输入草稿不会提前改变结果，提交回到首页', () => {
    render(<AdminSearchPrototype />)
    fireEvent.click(panel().getByRole('button', { name: '下一页' }))
    const target = DEMO_RECORDS.filter(item => item.kind === 'text').at(-1)!
    fireEvent.change(panel().getByRole('searchbox'), { target: { value: target.id } })
    expect(panel().queryByText('找到 1 条')).not.toBeInTheDocument()
    fireEvent.submit(panel().getByRole('search'))
    expect(panel().getByText('找到 1 条')).toBeVisible()
    expect(panel().getByRole('table')).toHaveTextContent(target.id)
    expect(panel().getByRole('button', { name: '上一页' })).toBeDisabled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('切换页签保留各自条件和页码，重置可恢复当前类型全部数据', () => {
    render(<AdminSearchPrototype />)
    fireEvent.click(panel().getByRole('button', { name: '下一页' }))
    switchTab('文件')
    const target = DEMO_RECORDS.find(item => item.kind === 'file')!
    search(target.id)
    expect(panel().getByText('找到 1 条')).toBeVisible()
    switchTab('文本 / 代码')
    expect(panel().getByRole('button', { name: '上一页' })).toBeEnabled()
    switchTab('文件')
    expect(panel().getByRole('searchbox')).toHaveValue(target.id)
    expect(panel().getByText('找到 1 条')).toBeVisible()
    fireEvent.click(panel().getByRole('button', { name: '重置' }))
    expect(panel().getByRole('searchbox')).toHaveValue('')
    expect(panel().getByText(`找到 ${DEMO_RECORDS.filter(item => item.kind === 'file').length} 条`)).toBeVisible()
  })

  it('反向日期保留原结果并提示，空结果可以清空恢复', () => {
    render(<AdminSearchPrototype />)
    fireEvent.change(panel().getByLabelText('创建开始日期'), { target: { value: '2026-10-21' } })
    fireEvent.change(panel().getByLabelText('创建结束日期'), { target: { value: '2026-10-01' } })
    fireEvent.submit(panel().getByRole('search'))
    expect(panel().getByRole('alert')).toHaveTextContent('开始日期不能晚于结束日期')
    expect(panel().getByRole('table')).toBeVisible()
    fireEvent.click(panel().getByRole('button', { name: '重置' }))
    search('does-not-exist')
    expect(panel().getByText('没有匹配的分享')).toBeVisible()
    fireEvent.click(panel().getByRole('button', { name: '清空筛选' }))
    expect(panel().getByRole('table')).toBeVisible()
  })

  it('重试保留查询条件，区分无匹配和暂无记录，并可查看元信息', () => {
    render(<AdminSearchPrototype />)
    const target = DEMO_RECORDS.find(item => item.kind === 'text')!
    search(target.id)
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: 'error' } })
    expect(panel().getByRole('alert')).toHaveTextContent('记录加载失败')
    fireEvent.click(panel().getByRole('button', { name: '重试' }))
    expect(panel().getByRole('searchbox')).toHaveValue(target.id)
    fireEvent.click(panel().getByRole('button', { name: `查看 ${target.id}` }))
    expect(screen.getByRole('dialog')).toHaveTextContent(target.id)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: 'loading' } })
    expect(panel().getByRole('button', { name: '查询' })).toBeDisabled()
    expect(panel().getByText('正在加载记录…')).toBeVisible()
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: 'empty' } })
    expect(panel().getByText('暂无分享记录')).toBeVisible()
  })

  it('文件名、状态和同日创建范围共同限制结果，并显示已应用条件', () => {
    render(<AdminSearchPrototype />)
    switchTab('文件')
    fireEvent.change(panel().getByRole('searchbox'), { target: { value: '交付' } })
    fireEvent.change(panel().getByLabelText('状态'), { target: { value: 'active' } })
    fireEvent.change(panel().getByLabelText('创建开始日期'), { target: { value: '2026-10-21' } })
    fireEvent.change(panel().getByLabelText('创建结束日期'), { target: { value: '2026-10-21' } })
    fireEvent.submit(panel().getByRole('search'))
    expect(panel().getByText('找到 2 条')).toBeVisible()
    expect(panel().getByRole('table')).toHaveTextContent('交付说明_v3.pdf')
    expect(panel().getByRole('table')).not.toHaveTextContent('交付清单_20261020.xlsx')
    expect(panel().getByLabelText('当前生效条件')).toHaveTextContent('状态：可访问')
  })
})
