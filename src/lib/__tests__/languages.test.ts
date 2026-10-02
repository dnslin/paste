import { describe, expect, it } from 'vitest'
import { bundledLanguages } from 'shiki/langs'
import { LANGUAGES, getLanguageName, normalizeLanguage } from '../languages'

describe('实际支持的代码语言', () => {
  it('每个可选语言都存在于Shiki，仅纯文本使用特殊模式', () => {
    expect(LANGUAGES.length).toBeGreaterThan(200)
    expect(new Set(LANGUAGES.map((language) => language.id)).size).toBe(LANGUAGES.length)
    for (const language of LANGUAGES) {
      if (language.id !== 'plaintext') expect(Object.hasOwn(bundledLanguages, language.id), language.id).toBe(true)
    }
    expect(normalizeLanguage('modelica')).toBeNull()
  })

  it.each([
    ['JS', 'javascript'], [' py ', 'python'], ['zsh', 'shellscript'], ['text', 'plaintext'],
    ['docker-compose', 'yaml'], ['kubernetes', 'yaml'], ['helm', 'yaml'],
  ])('规范别名%s为%s', (alias, id) => { expect(normalizeLanguage(alias)).toBe(id) })

  it('别名与规范ID具有相同展示名', () => {
    expect(getLanguageName('js')).toBe(getLanguageName('javascript'))
    expect(getLanguageName('plaintext')).toBe('纯文本')
  })
})
