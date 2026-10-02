// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { codeToHtml } from 'shiki'
import { escapeHtml, highlightCode, plainCodeHtml } from '../highlight'

vi.mock('shiki', async (importOriginal) => {
  const original = await importOriginal<typeof import('shiki')>()
  return { ...original, codeToHtml: vi.fn(original.codeToHtml) }
})

afterEach(() => { vi.restoreAllMocks() })

describe('统一高亮与行号', () => {
  it('转义ampersand和HTML，纯文本保持原始内容与空行', async () => {
    const content = '&lt;tag&gt;\n<img src=x onerror=alert(1)>\n'
    expect(escapeHtml(content)).toContain('&amp;lt;tag&amp;gt;')
    const html = await highlightCode(content, 'plaintext')
    expect(html).toBe(plainCodeHtml(content))
    expect(html).not.toContain('<img')
    expect(html).toContain('aria-hidden="true">3')
  })

  it('别名使用实际语法并提供隐藏于读屏的行号', async () => {
    const html = await highlightCode('const x = 1\nconsole.log(x)', 'js')
    expect(html).toContain('shiki')
    expect(html).toContain('class="line-number" aria-hidden="true">1')
    expect(html).toContain('class="line-number" aria-hidden="true">2')
    expect(html).toContain('class="line-content"')
  })

  it('高亮失败返回安全纯文本并保留诊断', async () => {
    const error = new Error('engine failed')
    vi.mocked(codeToHtml).mockRejectedValueOnce(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await highlightCode('<tag>&lt;', 'js')).toBe(plainCodeHtml('<tag>&lt;'))
    expect(log).toHaveBeenCalledWith('代码高亮失败，语言：javascript', error)
  })
})
