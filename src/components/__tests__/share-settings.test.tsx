import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionsPanel, type PasteOptions } from '@/components/paste/options-panel'
import { FileOptions } from '@/components/file-share/file-options'
import type { FileShareOptions } from '@/components/file-share/presentation'

beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn() })

function TextSettings() {
  const [options, setOptions] = useState<PasteOptions>({ password: '', expiresIn: 1440, burnAfterRead: null })
  return <OptionsPanel value={options} onChange={setOptions} />
}

function FileSettings() {
  const [options, setOptions] = useState<FileShareOptions>({ password: '', expiresIn: 1440, downloadLimit: 3 })
  return <FileOptions value={options} onChange={setOptions} disabled={false} />
}

async function choose(name: string, option: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name: option }))
}

describe('分享设置摘要', () => {
  it.each([
    { kind: '文本', Settings: TextSettings, error: '空白密码', invalidPassword: '   ', correctedPassword: 'valid-password' },
    { kind: '文本', Settings: TextSettings, error: '超长密码', invalidPassword: '密'.repeat(25), correctedPassword: '' },
    { kind: '文件', Settings: FileSettings, error: '空白密码', invalidPassword: '   ', correctedPassword: 'valid-password' },
    { kind: '文件', Settings: FileSettings, error: '超长密码', invalidPassword: '密'.repeat(25), correctedPassword: '' },
  ])('$kind：未点击展开按钮时，纠正$error后保持展开，主动收起才关闭', async ({ Settings, invalidPassword, correctedPassword }) => {
    render(<Settings />)
    const toggle = screen.getByRole('button', { name: '分享设置' })
    const password = screen.getByLabelText('密码保护')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    // Desktop fields are visible without clicking the mobile-only trigger.
    fireEvent.change(password, { target: { value: invalidPassword } })
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(password, { target: { value: correctedPassword } })
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(password).toHaveValue(correctedPassword)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(password).toHaveValue(correctedPassword)
  })

  it('收起后保留文本选项，摘要跟随有效期、次数和密码更新', async () => {
    render(<TextSettings />)
    const toggle = screen.getByRole('button', { name: '分享设置' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleDescription('1 天有效 · 不限次数 · 无密码')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await choose('有效期', '永不过期')
    await choose('查看次数限制', '1 次')
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'private-password' } })
    expect(toggle).toHaveAccessibleDescription('永不过期 · 1 次查看 · 密码保护')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByLabelText('密码保护')).toHaveValue('private-password')
    expect(screen.getByRole('combobox', { name: '有效期' })).toHaveTextContent('永不过期')
    expect(screen.getByRole('combobox', { name: '查看次数限制' })).toHaveTextContent('1 次')
  })

  it('文件摘要保留默认三次下载，并反映修改后的选项', async () => {
    render(<FileSettings />)
    const toggle = screen.getByRole('button', { name: '分享设置' })
    expect(toggle).toHaveAccessibleDescription('1 天有效 · 3 次下载 · 无密码')
    fireEvent.click(toggle)
    await choose('有效期', '7 天')
    await choose('下载次数', '不限次数')
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'protected-file' } })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleDescription('7 天有效 · 不限次数 · 密码保护')
    fireEvent.click(toggle)
    expect(screen.getByLabelText('密码保护')).toHaveValue('protected-file')
  })

  it('密码无效时保持设置展开，避免把错误留在折叠区域', async () => {
    render(<TextSettings />)
    const toggle = screen.getByRole('button', { name: '分享设置' })
    fireEvent.click(toggle)
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '   ' } })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '' } })
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
