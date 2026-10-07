'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { FileIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuccessDialog } from '@/components/paste/success-dialog'
import { getPasswordError } from '@/lib/paste-rules'
import { formatFileSize } from './file-client'
import { useFileUpload, type FileUploadOptions } from './use-file-upload'

const initialOptions: FileUploadOptions = { password: '', expiresIn: 1440, burnAfterRead: 1 }
const maxSize = 10 * 1024 * 1024
const selectClass = 'h-10 w-full rounded-md border border-(--border-default) bg-(--bg-elevated) px-3 text-sm focus-visible:outline-2 focus-visible:outline-(--accent-primary)'

export function FileCreator() {
  const id = useId()
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState(initialOptions)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const transfer = useFileUpload()
  const error = selectionError || transfer.error
  const passwordError = getPasswordError(options.password)
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  const choose = (files: FileList | File[] | null) => {
    if (transfer.busy || !files?.length) return
    setSelectionError(null)
    if (files.length !== 1) { setFile(null); setSelectionError('一次只能选择一个文件。'); return }
    if (files[0].size > maxSize) { setFile(null); setSelectionError('文件不能超过 10 MiB，请选择较小的文件。'); return }
    setFile(files[0])
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!file || passwordError || transfer.busy || selectionError) return
    setDialogOpen(true)
    transfer.upload(file, options)
  }
  return <form onSubmit={submit} className="space-y-5">
    <div role="group" aria-label="文件选择区" className={`space-y-4 rounded-xl border border-dashed bg-(--bg-surface) p-6 ${dragging ? 'border-(--accent-primary)' : 'border-(--border-default)'}`}
      onDragOver={(event) => { event.preventDefault(); if (!transfer.busy) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files) }}>
      <div className="space-y-2 text-center"><Upload className="mx-auto size-7 text-(--accent-primary)" aria-hidden="true" /><h2 className="text-lg font-medium">选择一个文件，安全分享</h2><p id={`${id}-help`} className="text-sm text-(--text-secondary)">拖放文件到此处，或用下方按钮选择。单文件最大 10 MiB。</p></div>
      <label htmlFor={`${id}-file`} className="sr-only">选择文件</label>
      <input ref={input} id={`${id}-file`} type="file" aria-describedby={`${id}-help`} disabled={transfer.busy} onChange={(event) => { choose(event.target.files); event.target.value = '' }} className="block w-full min-w-0 text-sm text-(--text-secondary) file:mr-3 file:rounded-md file:border-0 file:bg-(--bg-elevated) file:px-4 file:py-2 file:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)" />
      {file ? <div className="flex items-center gap-3 rounded-lg bg-(--bg-elevated) p-3"><FileIcon className="size-5 shrink-0 text-(--accent-primary)" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="break-all text-sm">{file.name}</p><p className="font-mono text-xs text-(--text-secondary)">{formatFileSize(file.size)}</p></div><Button type="button" variant="ghost" size="icon" aria-label="移除文件" disabled={transfer.busy} onClick={() => { setFile(null); input.current?.focus() }}><X className="size-4" aria-hidden="true" /></Button></div> : null}
    </div>
    <fieldset disabled={transfer.busy} className="grid grid-cols-1 gap-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4 sm:grid-cols-2">
      <legend className="sr-only">文件分享选项</legend>
      <div className="space-y-2 sm:col-span-2"><label htmlFor={`${id}-password`} className="text-sm text-(--text-secondary)">文件访问密码（可选）</label><Input id={`${id}-password`} type="password" autoComplete="new-password" value={options.password} onChange={(event) => setOptions({ ...options, password: event.target.value })} aria-invalid={!!passwordError} aria-describedby={passwordError ? `${id}-password-error` : undefined} />{passwordError ? <p id={`${id}-password-error`} className="text-sm text-red-400">{passwordError}</p> : null}</div>
      <div className="space-y-2"><label htmlFor={`${id}-expiry`} className="text-sm text-(--text-secondary)">有效期</label><select id={`${id}-expiry`} className={selectClass} value={options.expiresIn} onChange={(event) => setOptions({ ...options, expiresIn: Number(event.target.value) })}><option value={5}>5 分钟</option><option value={30}>30 分钟</option><option value={60}>1 小时</option><option value={1440}>1 天</option><option value={10080}>7 天</option></select></div>
      <div className="space-y-2"><label htmlFor={`${id}-count`} className="text-sm text-(--text-secondary)">允许领取下载的次数</label><select id={`${id}-count`} className={selectClass} value={options.burnAfterRead} onChange={(event) => setOptions({ ...options, burnAfterRead: Number(event.target.value) })}>{[1, 3, 5, 10].map((count) => <option key={count} value={count}>{count} 次</option>)}</select></div>
    </fieldset>
    <p className="text-sm leading-6 text-(--text-secondary)">领取下载授权时扣一次，有效凭证内重试不重复扣次。文件最多保留 7 天，不提供预览或病毒检测。</p>
    {transfer.busy ? <div className="space-y-2" aria-live="polite"><p className="text-sm text-(--text-secondary)">{transfer.phase === 'processing' ? '服务器处理中…' : transfer.progress === null ? '正在上传…' : `正在上传 ${transfer.progress}%`}</p><progress aria-label="文件上传进度" max={100} value={transfer.progress ?? undefined} className="h-2 w-full accent-(--accent-primary)" /></div> : null}
    {error ? <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-red-400">{error}</p> : null}
    {transfer.uncertain ? <div className="space-y-3 rounded-lg border border-(--border-subtle) p-4 text-sm"><a href="/admin" target="_blank" rel="noopener noreferrer" className="text-(--accent-primary) underline underline-offset-4">打开管理列表</a><label className="flex items-start gap-2"><input type="checkbox" checked={transfer.checked} onChange={(event) => transfer.setChecked(event.target.checked)} className="mt-1 accent-(--accent-primary)" />我已检查管理列表，确认需要重新上传</label></div> : null}
    <Button type="submit" className="h-11 w-full gap-2" disabled={!file || !!passwordError || !!selectionError || transfer.busy || (transfer.uncertain && !transfer.checked)}><Upload className="size-4" aria-hidden="true" />上传并创建分享</Button>
    {transfer.busy ? <Button type="button" variant="outline" className="w-full" onClick={transfer.cancel}>取消上传</Button> : null}
    {transfer.result ? <SuccessDialog open={dialogOpen} onOpenChange={setDialogOpen} url={transfer.result.url} onCreateAnother={() => { setFile(null); setOptions(initialOptions); transfer.clearResult() }} /> : null}
  </form>
}
