'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { MAX_CONTENT_LENGTH } from '@/lib/paste-rules'
import { CodeDisplay } from './code-display'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  maxLength?: number
}

export function CodeEditor({ value, onChange, language, maxLength = MAX_CONTENT_LENGTH }: CodeEditorProps) {
  const editorId = useId()
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const leaveEditor = useRef(false)
  const isOverLimit = value.length > maxLength

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') { leaveEditor.current = true; return }
    if (event.key !== 'Tab') { leaveEditor.current = false; return }
    if (event.shiftKey || leaveEditor.current) { leaveEditor.current = false; return }
    event.preventDefault()
    const target = event.currentTarget
    const start = target.selectionStart
    onChange(value.slice(0, start) + '  ' + value.slice(target.selectionEnd))
    requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 2 })
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextTab: 'edit' | 'preview'
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') nextTab = activeTab === 'edit' ? 'preview' : 'edit'
    else if (event.key === 'Home') nextTab = 'edit'
    else if (event.key === 'End') nextTab = 'preview'
    else return
    event.preventDefault()
    setActiveTab(nextTab)
    event.currentTarget.ownerDocument.getElementById(`${editorId}-${nextTab}`)?.focus()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
      <label htmlFor={editorId} className="sr-only">代码或文本内容</label>
      <div role="tablist" aria-label="编辑与预览" className="flex border-b border-(--border-subtle)">
        {(['edit', 'preview'] as const).map((tab) => <button
          key={tab} id={`${editorId}-${tab}`} type="button" role="tab" aria-selected={activeTab === tab}
          aria-controls={`${editorId}-panel`} tabIndex={activeTab === tab ? 0 : -1}
          onClick={() => setActiveTab(tab)} onKeyDown={handleTabKeyDown}
          className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-(--accent-primary) text-(--accent-primary)' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}
        >{tab === 'edit' ? '编辑' : '预览'}</button>)}
      </div>
      <div id={`${editorId}-panel`} role="tabpanel" aria-labelledby={`${editorId}-${activeTab}`} tabIndex={activeTab === 'preview' ? 0 : undefined} className="h-75 max-h-[50vh] sm:h-87.5">
        {activeTab === 'edit' ? <textarea
          id={editorId} data-testid="code-editor" value={value} onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown} onBlur={() => { leaveEditor.current = false }}
          placeholder="粘贴代码或文本…" spellCheck={false} aria-describedby={`${editorId}-hint ${editorId}-count`} aria-invalid={isOverLimit}
          className="h-full w-full resize-none bg-transparent p-3 font-mono text-sm text-(--text-primary) placeholder:text-(--text-secondary) outline-none focus:ring-2 focus:ring-(--accent-primary) focus:ring-inset sm:p-4"
        /> : <div className="h-full overflow-auto py-3 sm:py-4">{value ? <CodeDisplay code={value} language={language} delay={300} /> : <p className="p-4 text-sm text-(--text-secondary)">暂无内容可预览</p>}</div>}
      </div>
      <div className="space-y-1 border-t border-(--border-subtle) px-3 py-2 text-xs text-(--text-secondary) sm:px-4">
        <p id={`${editorId}-count`} className={isOverLimit ? 'text-red-400' : undefined}>{value.length.toLocaleString()} / {maxLength.toLocaleString()}{isOverLimit ? '，内容超过长度限制' : ''}</p>
        <p id={`${editorId}-hint`}>Tab 缩进；Esc 后按 Tab 或 Shift+Tab 离开编辑器。</p>
      </div>
    </div>
  )
}
