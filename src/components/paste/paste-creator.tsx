'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { CodeEditor } from './code-editor'
import { LanguageSelector } from './language-selector'
import { OptionsPanel, type PasteOptions } from './options-panel'
import { PasteCreatedContent, SuccessDialog } from './success-dialog'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'
import { MAX_CONTENT_LENGTH, getPasswordError } from '@/lib/paste-rules'

const initialOptions: PasteOptions = { password: '', expiresIn: 1440, burnAfterRead: null }
type CreatedPaste = { id: string; url: string; expiresAt: string | null }

export function PasteCreator({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [options, setOptions] = useState<PasteOptions>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedPaste | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const currentView = useRef<HTMLElement | null>(null)
  const focusNewForm = useRef(false)
  const passwordError = getPasswordError(options.password)
  const isInvalid = !code.trim() || code.length > MAX_CONTENT_LENGTH || passwordError !== null

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isInvalid || isLoading || result) return
    setIsLoading(true)
    onBusyChange?.(true)
    setError(null)
    try {
      const res = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code, language, password: options.password || undefined, expiresIn: options.expiresIn, burnAfterRead: options.burnAfterRead }),
      })
      const data: ApiResponse<CreatedPaste> = await res.json()
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
      onBusyChange?.(false)
    }
  }

  function createAnother() {
    focusNewForm.current = true
    setDialogOpen(false)
    setCode(''); setLanguage('plaintext'); setOptions(initialOptions); setResult(null); setError(null)
  }

  function focusCurrentView() {
    const view = currentView.current
    if (view && !view.closest('[hidden]')) {
      (view.querySelector<HTMLElement>('textarea') ?? view.querySelector<HTMLElement>('button'))?.focus()
    }
  }

  function restoreFocus(event: Event) {
    event.preventDefault()
    focusCurrentView()
  }

  if (result) return <section ref={(view) => { currentView.current = view }} aria-label="已创建的文本分享" className="space-y-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4 sm:p-6">
    {!dialogOpen ? <>
      <h2 className="font-medium">链接已生成</h2>
      <PasteCreatedContent url={result.url} language={language} expiresAt={result.expiresAt} viewLimit={options.burnAfterRead} hasPassword={!!options.password} onCreateAnother={createAnother} />
    </> : null}
    <SuccessDialog open={dialogOpen} onOpenChange={setDialogOpen} url={result.url} language={language} expiresAt={result.expiresAt} viewLimit={options.burnAfterRead} hasPassword={!!options.password} onCreateAnother={createAnother} onCloseAutoFocus={restoreFocus} />
  </section>

  return (
    <form ref={(view) => {
      currentView.current = view
      if (view && focusNewForm.current) { focusNewForm.current = false; focusCurrentView() }
    }} onSubmit={handleCreate} className="w-full">
      <fieldset disabled={isLoading} className="flex min-w-0 flex-col gap-4 sm:gap-5">
        <div className="flex items-center gap-3">
          <label htmlFor="code-language" className="text-sm font-medium text-(--text-secondary)">代码语言</label>
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
        <CodeEditor value={code} onChange={setCode} language={language} />
        <OptionsPanel value={options} onChange={setOptions} disabled={isLoading} />
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" disabled={isInvalid || isLoading} className="h-11 w-full gap-2" size="lg">
          {isLoading ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {isLoading ? '正在生成链接…' : '生成链接'}
        </Button>
      </fieldset>
    </form>
  )
}
