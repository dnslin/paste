'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PasteCreator } from '@/components/paste/paste-creator'
import { FileCreator } from './file-creator'

export function ShareCreator({ allowFiles }: { allowFiles: boolean }) {
  const [kind, setKind] = useState<'text' | 'file'>('text')
  return <div className="space-y-5">
    {allowFiles ? <div role="group" aria-label="分享类型" className="flex gap-2">
      <Button type="button" variant={kind === 'text' ? 'default' : 'outline'} aria-pressed={kind === 'text'} onClick={() => setKind('text')}>文本</Button>
      <Button type="button" variant={kind === 'file' ? 'default' : 'outline'} aria-pressed={kind === 'file'} onClick={() => setKind('file')}>文件</Button>
    </div> : null}
    <div hidden={kind !== 'text'}><PasteCreator /></div>
    {allowFiles ? <div hidden={kind !== 'file'}><FileCreator /></div> : null}
  </div>
}
