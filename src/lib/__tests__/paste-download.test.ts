import { describe, expect, it } from 'vitest'
import { getPasteDownloadFilename } from '../paste-download'

describe('原文下载文件名', () => {
  it.each([
    ['json', 'json'], ['jsonc', 'jsonc'], ['sql', 'sql'], ['yaml', 'yaml'],
    ['toml', 'toml'], ['ini', 'ini'], ['nginx', 'conf'],
  ])('%s 使用约定的 .%s 后缀', (language, extension) => {
    expect(getPasteDownloadFilename('n7Kp2xQm', language)).toBe(`paste-n7Kp2xQm.${extension}`)
  })

  it.each(['YML', ' yaml ', 'docker-compose', 'kubernetes', 'k8s', 'helm'])('%s 按现有语言别名保存为 YAML', (language) => {
    expect(getPasteDownloadFilename('aB12cD34', language)).toBe('paste-aB12cD34.yaml')
  })

  it.each(['plaintext', 'text', 'javascript', 'js', 'python', 'unknown-language', ''])('%s 未配置专用后缀时保存为 .txt', (language) => {
    expect(getPasteDownloadFilename('aB12cD34', language)).toBe('paste-aB12cD34.txt')
  })
})
