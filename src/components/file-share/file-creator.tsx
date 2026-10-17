'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPasswordError } from '@/lib/paste-rules'
import { FILE_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/file-rules'
import type { CreatedFileShare } from '@/lib/file-share-contract'
import { FileDropzone } from './file-dropzone'
import { FileOptions } from './file-options'
import { FileCreatedDialog } from './file-created-dialog'
import { useFileUpload } from './use-file-upload'
import type { FileShareOptions } from './presentation'

const initialOptions: FileShareOptions = { password: '', expiresIn: 1440, downloadLimit: 3 }

export function FileCreator({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [options, setOptions] = useState<FileShareOptions>(initialOptions)
  const [result, setResult] = useState<CreatedFileShare | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const upload = useFileUpload((created) => { setResult(created); setDialogOpen(true) }, onBusyChange)
  const invalid = !file || getPasswordError(options.password) !== null

  function selectFile(files: File[]) {
    const error = files.length !== 1 ? '每条分享只能选择一个文件，请重新选择。'
      : files[0].size > MAX_FILE_BYTES ? '文件超过 10 MiB，请选择更小的文件。'
        : !FILE_EXTENSIONS.includes(files[0].name.split('.').pop()?.toLowerCase() ?? '') ? '请选择文本、PDF、图片或 ZIP 文件。' : null
    setFileError(error && file ? `${error} 未更换，仍可上传原文件。` : error)
    if (!error) setFile(files[0])
    upload.clearFeedback()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!invalid && file && !upload.busy) {
      setFileError(null)
      upload.start(file, options)
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <FileDropzone file={file} error={fileError} disabled={upload.busy} onSelect={selectFile}
      onRemove={() => { setFile(null); setFileError(null); upload.clearFeedback() }} />
    <FileOptions value={options} onChange={setOptions} disabled={upload.busy} />
    {upload.busy ? <div className="space-y-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-4" aria-busy="true">
      <div className="flex items-center justify-between text-sm"><span role="status">{upload.phase === 'completing' ? '上传完成，正在保存…' : '正在上传文件…'}</span>{upload.progress !== null ? <span className="font-mono text-(--accent-primary)">{upload.progress}%</span> : null}</div>
      <progress aria-label="文件上传进度" value={upload.progress ?? undefined} max={100} className="block h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-(--bg-elevated) [&::-webkit-progress-value]:bg-(--accent-primary) [&::-moz-progress-bar]:bg-(--accent-primary)" />
    </div> : null}
    {upload.error ? <p role="alert" className="text-sm text-red-400">{upload.error}</p> : null}
    {upload.notice ? <p role="status" className="text-sm text-(--text-secondary)">{upload.notice}</p> : null}
    <div className={upload.busy ? 'grid grid-cols-[1fr_auto] gap-3' : ''}>
      <Button type="submit" disabled={invalid || upload.busy} size="lg" className="h-11 w-full gap-2">
        {upload.busy ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {upload.busy ? '正在创建分享…' : upload.error ? '重试上传' : '创建文件分享'}
      </Button>
      {upload.busy ? <Button type="button" variant="outline" className="h-11" onClick={upload.cancel}>取消</Button> : null}
    </div>
    {result && file ? <FileCreatedDialog key={result.id} result={result} fileName={file.name} hasPassword={!!options.password} open={dialogOpen} onOpenChange={setDialogOpen}
      onCreateAnother={() => { setFile(null); setFileError(null); setOptions(initialOptions); setResult(null); upload.clearFeedback() }} /> : null}
  </form>
}
