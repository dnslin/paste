'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Clock, Download, File as FileIcon, FileX, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CodeDisplay } from '@/components/paste/code-display'
import { getPasswordError } from '@/lib/paste-rules'
import { expiryLabel, formatBytes, itemName, type PrototypeShare } from './model'

export type ReceiverScenario = 'current' | 'protected' | 'expired' | 'exhausted'

interface ShareReceiverProps {
  share: PrototypeShare
  scenario: ReceiverScenario
  deleted?: boolean
  exhausted?: boolean
  onBack: () => void
  onExhausted?: () => void
}

export function ShareReceiver({ share, scenario, deleted = false, exhausted = false, onBack, onExhausted }: ShareReceiverProps) {
  const id = useId()
  const requiredPassword = scenario === 'protected' ? share.options.password || 'paste-demo' : share.options.password
  const [unlocked, setUnlocked] = useState(!requiredPassword)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'ready'>('idle')
  const [used, setUsed] = useState(0)
  const pending = useRef(false)
  const urls = useRef<string[]>([])
  const remaining = share.options.limit === null ? null : Math.max(0, share.options.limit - used)
  const passwordError = getPasswordError(password)
  const isFile = share.item.kind === 'file'

  useEffect(() => {
    const createdUrls = urls.current
    return () => { createdUrls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [])

  useEffect(() => {
    if (phase !== 'preparing' || deleted) return
    const timer = setTimeout(() => {
      try {
        if (share.item.kind === 'file') {
          const url = URL.createObjectURL(share.item.file)
          urls.current.push(url)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = share.item.file.name
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
        }
        setUsed((value) => value + 1)
        if (share.options.limit !== null && used + 1 >= share.options.limit) onExhausted?.()
        setPhase('ready')
      } catch {
        setError('无法准备文件，请重新尝试。此次没有扣除下载机会。')
        setPhase('idle')
      } finally { pending.current = false }
    }, 650)
    return () => clearTimeout(timer)
  }, [phase, share, deleted, used, onExhausted])

  function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || remaining === 0 || passwordError) return
    if (requiredPassword && password !== requiredPassword) {
      setError('密码不正确，请重新输入。')
      return
    }
    setError(null)
    setUnlocked(true)
    pending.current = true
    setPhase('preparing')
  }

  if (deleted || (exhausted && phase !== 'ready') || scenario === 'expired' || scenario === 'exhausted') {
    const expired = scenario === 'expired'
    const Icon = expired ? Clock : FileX
    return <div role="status" className="flex min-h-100 flex-col items-center justify-center gap-3 text-center">
      <Icon className="size-12 text-(--text-secondary)" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{deleted ? '分享已删除' : expired ? '分享已过期' : '下载机会已用尽'}</h1>
      <Button variant="link" onClick={onBack}>创建自己的分享</Button>
    </div>
  }

  return <div className="space-y-5">
    <Button variant="link" onClick={onBack} className="px-0"><ArrowLeft className="size-4" aria-hidden="true" />返回首页</Button>
    <form onSubmit={handleAccess} className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
      <div className="space-y-6 p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="pt-1 text-(--text-secondary)">{unlocked ? <FileIcon className="size-6" aria-hidden="true" /> : <Lock className="size-6" aria-hidden="true" />}</span>
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{unlocked ? itemName(share.item) : '受密码保护的分享'}</h1>
            {unlocked && share.item.kind === 'file' ? <p className="font-mono text-sm text-(--text-secondary)">{formatBytes(share.item.file.size)}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 border-y border-(--border-subtle) py-4 text-sm text-(--text-secondary)">
          <span className="inline-flex items-center gap-2"><Clock className="size-4" aria-hidden="true" />{share.options.expiresIn ? `${expiryLabel(share.options.expiresIn)}后到期` : '永不过期'}</span>
          <span className="inline-flex items-center gap-2"><Download className="size-4" aria-hidden="true" />{remaining === null ? '不限次数' : `剩余 ${remaining} 次${isFile ? '下载机会' : '查看机会'}`}</span>
        </div>
        {!unlocked ? <div className="space-y-2">
          <label htmlFor={id} className="text-sm font-medium">访问密码</label>
          <Input id={id} type="password" autoComplete="current-password" placeholder="输入创建者提供的密码" value={password}
            onChange={(event) => { setPassword(event.target.value); setError(null) }} aria-invalid={!!error || !!passwordError}
            aria-describedby={error || passwordError ? `${id}-error` : undefined} />
        </div> : null}
        {error || passwordError ? <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error || passwordError}</p> : null}
        {phase === 'ready' ? <p role="status" className="text-sm text-(--text-secondary)">
          {isFile ? '已发起下载。' : '内容已显示。'}{remaining === 0 ? '这是最后一次机会。' : ''}
        </p> : null}
        {share.item.kind === 'text' && phase === 'ready' ? <CodeDisplay code={share.item.content} language={share.item.language} wrap /> : null}
        <Button type="submit" size="lg" disabled={phase === 'preparing' || remaining === 0 || !!passwordError || (!unlocked && !password)} className="h-11 w-full gap-2">
          {phase === 'preparing' ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {phase === 'preparing' ? '正在准备…' : remaining === 0 ? '下载机会已用尽' : !unlocked ? isFile ? '验证密码并下载' : '验证密码并查看' : isFile ? '下载文件' : '查看文本'}
        </Button>
        {remaining !== null && remaining > 0 ? <p className="text-xs text-(--text-secondary)">{isFile ? '每次下载扣 1 次，中断也计次。' : '查看后扣 1 次。'}</p> : null}
      </div>
    </form>
  </div>
}
