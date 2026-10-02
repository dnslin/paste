import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginForm } from '../login-form'

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  push.mockClear()
  refresh.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: true, media, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('LoginForm', () => {
  it('关联密码标签，失败后显示错误并保留输入，减少动态效果时不做位移', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: '密码不正确' } }, { status: 401 }))
    render(<LoginForm />)
    const password = screen.getByLabelText('管理员密码')
    fireEvent.change(password, { target: { value: 'incorrect' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('密码不正确')
    expect(error.style.transform).not.toContain('translate')
    expect(password).toHaveValue('incorrect')
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })

  it('验证通过后打开后台并刷新会话', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { message: '登录成功' } }))
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('管理员密码'), { target: { value: 'correct' } })
    fireEvent.submit(screen.getByRole('form', { name: '管理员登录' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'))
    expect(refresh).toHaveBeenCalledOnce()
  })
})
