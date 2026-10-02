'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { CodeEditor } from './code-editor'
import { LanguageSelector } from './language-selector'
import { OptionsPanel, type PasteOptions } from './options-panel'
import { SuccessDialog } from './success-dialog'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'
import { MAX_CONTENT_LENGTH, getPasswordError } from '@/lib/paste-rules'

const initialOptions: PasteOptions = { password: '', expiresIn: 1440, burnAfterRead: null }

export function PasteCreator() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [options, setOptions] = useState<PasteOptions>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string; url: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const passwordError = getPasswordError(options.password)
  const isInvalid = !code.trim() || code.length > MAX_CONTENT_LENGTH || passwordError !== null

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isInvalid || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code, language, password: options.password || undefined, expiresIn: options.expiresIn, burnAfterRead: options.burnAfterRead }),
      })
      const data: ApiResponse<{ id: string; url: string }> = await res.json()
      if (!data.success) {
        setError(data.error.message)
      } else if (!res.ok) {
        setError('创建失败，请稍后重试。')
      } else {
        setResult(data.data)
        setDialogOpen(true)
      }
    } catch {
      setError('无法创建内容，请检查网络连接后重试。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex w-full flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-3">
        <label htmlFor="code-language" className="text-sm font-medium text-(--text-secondary)">代码语言</label>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>
      <CodeEditor value={code} onChange={setCode} language={language} />
      <OptionsPanel value={options} onChange={setOptions} />
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" disabled={isInvalid || isLoading} className="h-11 w-full gap-2" size="lg">
        {isLoading ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {isLoading ? '正在创建…' : '创建内容'}
      </Button>
      {result ? <SuccessDialog open={dialogOpen} onOpenChange={setDialogOpen} url={result.url} onCreateAnother={() => {
        setCode(''); setLanguage('plaintext'); setOptions(initialOptions); setResult(null); setError(null)
      }} /> : null}
    </form>
  )
}
