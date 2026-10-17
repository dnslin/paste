'use client'

import { useId, useRef, useState, type DragEvent } from 'react'
import { File as FileIcon, FileUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FILE_ACCEPT } from '@/lib/file-rules'
import { formatBytes } from './presentation'

interface FileDropzoneProps {
  file: File | null
  error: string | null
  disabled: boolean
  onSelect: (files: File[]) => void
  onRemove: () => void
}

export function FileDropzone({ file, error, disabled, onSelect, onRemove }: FileDropzoneProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) onSelect(Array.from(event.dataTransfer.files))
  }

  return <div className="space-y-3">
    <input ref={input} id={id} type="file" className="sr-only" tabIndex={-1} accept={FILE_ACCEPT}
      aria-label="选择分享文件" disabled={disabled}
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? [])
        if (files.length) onSelect(files)
        event.currentTarget.value = ''
      }} />
    <div onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
      className={cn('flex min-h-72 flex-col justify-center rounded-xl border bg-(--bg-surface) px-5 py-8 sm:px-8',
        dragging ? 'border-dashed border-(--accent-primary) bg-amber-500/5' : 'border-(--border-subtle)')}>
      {file ? <div className="space-y-5">
        <div className="flex items-start gap-4">
          <FileIcon className="mt-1 size-6 shrink-0 text-(--text-secondary)" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1"><p className="font-medium [overflow-wrap:anywhere]">{file.name}</p><p className="font-mono text-xs text-(--text-secondary)">{formatBytes(file.size)}</p></div>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={onRemove} aria-label="移除文件"><X aria-hidden="true" /></Button>
        </div>
        <div className="text-center"><Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>更换文件</Button></div>
      </div> : <div className="flex flex-col items-center text-center">
        <FileUp className="mb-4 size-7 text-(--text-secondary)" aria-hidden="true" />
        <h2 className="text-base font-medium">拖入文件</h2>
        <p id={`${id}-hint`} className="mt-2 text-xs text-(--text-secondary)">文本、PDF、图片、ZIP · 最大 10 MiB</p>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()} aria-describedby={`${id}-hint`} className="mt-5">选择文件</Button>
      </div>}
    </div>
    {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
  </div>
}
