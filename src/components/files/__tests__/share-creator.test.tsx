import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ShareCreator } from '../share-creator'

afterEach(cleanup)
describe('创建入口权限与切换', () => {
  it('匿名只显示现有文本入口', () => {
    render(<ShareCreator allowFiles={false} />)
    expect(screen.getByLabelText('代码或文本内容')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '文件' })).not.toBeInTheDocument()
  })
  it('管理员可选择文件且切换后保留已输入文本', () => {
    render(<ShareCreator allowFiles />)
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '保留我的文本' } })
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(screen.getByRole('button', { name: '上传并创建分享' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '文本' }))
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('保留我的文本')
  })
})
