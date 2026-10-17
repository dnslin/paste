'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Tabs } from 'radix-ui'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/paste/code-editor'
import { LanguageSelector } from '@/components/paste/language-selector'
import { OptionsPanel, type PasteOptions } from '@/components/paste/options-panel'
import { getPasswordError, MAX_CONTENT_LENGTH } from '@/lib/paste-rules'
import { FileDropzone } from './file-dropzone'
import { FileOptions } from './file-options'
import { getFileError, type PrototypeShare, type ShareOptions } from './model'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; share: PrototypeShare; fail: boolean }
  | { status: 'saving'; share: PrototypeShare }
  | { status: 'error' }

export function ShareCreator({ onCreated }: { onCreated: (share: PrototypeShare) => void }) {
  const [mode, setMode] = useState('file')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [options, setOptions] = useState<ShareOptions>({ password: '', expiresIn: 1440, limit: 3 })
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [textOptions, setTextOptions] = useState<PasteOptions>({ password: '', expiresIn: 1440, burnAfterRead: null })
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [notice, setNotice] = useState('')
  const busy = upload.status === 'uploading' || upload.status === 'saving'
  const fileFailed = mode === 'file' && upload.status === 'error'
  const passwordError = getPasswordError(mode === 'file' ? options.password : textOptions.password)
  const invalid = !!passwordError || (mode === 'file' ? !file : !text.trim() || text.length > MAX_CONTENT_LENGTH)

  useEffect(() => {
    if (upload.status !== 'uploading' && upload.status !== 'saving') return
    const timer = setTimeout(() => {
      if (upload.status === 'saving') {
        setUpload({ status: 'idle' })
        onCreated(upload.share)
      } else if (upload.fail && upload.progress >= 54) {
        setUpload({ status: 'error' })
        setSimulateFailure(false)
      } else if (upload.progress >= 90) {
        setUpload({ status: 'saving', share: upload.share })
      } else {
        setUpload({ ...upload, progress: upload.progress + 18 })
      }
    }, upload.status === 'saving' ? 600 : 300)
    return () => clearTimeout(timer)
  }, [upload, onCreated])

  function selectFile(files: File[]) {
    const error = getFileError(files)
    setFileError(error)
    setFile(error ? null : files[0])
    setUpload({ status: 'idle' })
    setNotice('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (invalid || busy) return
    setNotice('')
    if (mode === 'file' && file) {
      setUpload({ status: 'uploading', progress: 0, share: { item: { kind: 'file', file }, options: { ...options } }, fail: simulateFailure })
    } else {
      onCreated({ item: { kind: 'text', content: text, language }, options: { password: textOptions.password, expiresIn: textOptions.expiresIn ?? 0, limit: textOptions.burnAfterRead } })
    }
  }

  return <form onSubmit={handleSubmit} className="space-y-5">
    <Tabs.Root value={mode} onValueChange={(value) => { setMode(value); setNotice('') }}>
      <Tabs.List aria-label="分享类型" className="mb-5 flex gap-6 border-b border-(--border-subtle)">
        <Tabs.Trigger value="text" disabled={busy} className="h-11 border-b-2 border-transparent px-1 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50 data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)">文本 / 代码</Tabs.Trigger>
        <Tabs.Trigger value="file" disabled={busy} className="h-11 border-b-2 border-transparent px-1 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50 data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)">文件</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="file" className="space-y-5 outline-none">
        <FileDropzone file={file} error={fileError} disabled={busy} onSelect={selectFile} onRemove={() => { setFile(null); setFileError(null); setUpload({ status: 'idle' }) }} />
        <FileOptions value={options} onChange={setOptions} disabled={busy} />
      </Tabs.Content>
      <Tabs.Content value="text" className="space-y-5 outline-none">
        <div className="flex items-center gap-3"><label htmlFor="code-language" className="text-sm text-(--text-secondary)">代码语言</label><LanguageSelector value={language} onChange={setLanguage} /></div>
        <CodeEditor value={text} onChange={setText} language={language} />
        <OptionsPanel value={textOptions} onChange={setTextOptions} />
      </Tabs.Content>
    </Tabs.Root>
    {busy ? <div className="space-y-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-4" aria-busy="true">
      <div className="flex items-center justify-between text-sm"><span role="status">{upload.status === 'saving' ? '上传完成，正在保存…' : '正在上传文件…'}</span><span className="font-mono text-(--accent-primary)">{upload.status === 'saving' ? 100 : upload.progress}%</span></div>
      <progress aria-label="文件上传进度" value={upload.status === 'saving' ? 100 : upload.progress} max={100} className="block h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-(--bg-elevated) [&::-webkit-progress-value]:bg-(--accent-primary) [&::-moz-progress-bar]:bg-(--accent-primary)" />
    </div> : null}
    {fileFailed ? <p role="alert" className="text-sm text-red-400">网络中断，文件已保留，请重试。</p> : null}
    {notice ? <p role="status" className="text-sm text-(--text-secondary)">{notice}</p> : null}
    <div className={busy ? 'grid grid-cols-[1fr_auto] gap-3' : ''}>
      <Button type="submit" disabled={invalid || busy} size="lg" className="h-11 w-full gap-2">
        {busy ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {busy ? '正在创建分享…' : fileFailed ? '重试上传' : mode === 'file' ? '创建文件分享' : '创建文本分享'}
      </Button>
      {busy ? <Button type="button" variant="outline" className="h-11" onClick={() => { setUpload({ status: 'idle' }); setNotice('已取消上传，文件已保留。') }}>取消</Button> : null}
    </div>
    <details className="text-xs text-(--text-secondary)">
      <summary className="w-fit cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-(--accent-primary)">演示选项</summary>
      <label className="mt-3 flex w-fit items-center gap-2"><input type="checkbox" checked={simulateFailure} disabled={busy} onChange={(event) => setSimulateFailure(event.target.checked)} className="accent-amber-500" />模拟上传中断</label>
    </details>
  </form>
}
