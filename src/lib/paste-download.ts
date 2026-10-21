import { normalizeLanguage } from './languages'

const extensions: Record<string, string> = {
  json: 'json',
  jsonc: 'jsonc',
  sql: 'sql',
  yaml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  nginx: 'conf',
}

export function getPasteDownloadFilename(pasteId: string, language: string): string {
  const extension = extensions[normalizeLanguage(language) ?? 'plaintext'] ?? 'txt'
  return `paste-${pasteId}.${extension}`
}
