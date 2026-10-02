'use client'

import { useEffect, useMemo, useState } from 'react'
import { highlightCode, plainCodeHtml } from '@/lib/highlight'
import { cn } from '@/lib/utils'

interface CodeDisplayProps {
  code: string
  language: string
  wrap?: boolean
  delay?: number
}

export function CodeDisplay({ code, language, wrap = false, delay = 0 }: CodeDisplayProps) {
  const [highlight, setHighlight] = useState<{ code: string; language: string; html: string } | null>(null)
  const plainHtml = useMemo(() => plainCodeHtml(code), [code])
  const html = highlight?.code === code && highlight.language === language ? highlight.html : plainHtml

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      void highlightCode(code, language).then((highlightedHtml) => {
        if (!cancelled) setHighlight({ code, language, html: highlightedHtml })
      })
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, language, delay])

  return (
    <div
      className={cn(
        'overflow-x-auto font-mono text-sm leading-[1.7] [&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0! [&_code]:block [&_.line]:flex [&_.line]:min-h-[1.7em] [&_.line-number]:w-14 [&_.line-number]:shrink-0 [&_.line-number]:select-none [&_.line-number]:pr-3 [&_.line-number]:text-right [&_.line-number]:text-(--text-secondary) [&_.line-number]:border-r [&_.line-number]:border-(--border-subtle) [&_.line-content]:px-3 [&_.line-content]:min-w-0',
        wrap ? '[&_.line-content]:whitespace-pre-wrap [&_.line-content]:break-words [&_.line-content]:[overflow-wrap:anywhere]' : '[&_.line-content]:whitespace-pre',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
