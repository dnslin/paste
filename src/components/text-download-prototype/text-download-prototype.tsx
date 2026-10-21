'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Clock, Eye, Flame, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DownloadBody } from './download-body'
import { examples, initialAccess, scenarios, type Scenario } from './model'

const selectClass = 'h-11 min-w-0 rounded-md border border-(--border-subtle) bg-(--bg-elevated) px-3 text-sm text-(--text-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)'

export function TextDownloadPrototype() {
  const id = useId()
  const [language, setLanguage] = useState('json')
  const [access, setAccess] = useState(() => initialAccess('ready'))
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const example = examples.find((item) => item.language === language)!
  const protectedShare = access.scenario === 'protected'
  const expired = access.scenario === 'expired'
  const unavailable = expired || (!access.claimed && access.remaining === 0)

  function changeScenario(scenario: Scenario) {
    setAccess(initialAccess(scenario))
    setPassword('')
    setError(null)
    setVersion((value) => value + 1)
  }

  function reopen() {
    setAccess({ ...access, claimed: access.scenario === 'unlimited' })
    setPassword('')
    setError(null)
    setVersion((value) => value + 1)
  }

  function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (protectedShare && password !== 'paste-demo') {
      setError('密码不正确，请重新输入。')
      return
    }
    setError(null)
    setAccess({ ...access, claimed: true, remaining: access.remaining === null ? null : access.remaining - 1 })
  }

  const StatusIcon = expired ? Clock : Flame
  return <div className="min-h-screen bg-(--bg-base)">
    <header className="border-b border-(--border-subtle)">
      <div className="mx-auto max-w-225 space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-sm font-medium">下载文本原文 · 交互原型</h1>
          <p className="text-xs text-(--text-secondary)">本地原型 · 仅演示数据</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 flex-1 basis-32 gap-2 text-xs text-(--text-secondary)" htmlFor={`${id}-example`}>内容示例
            <select id={`${id}-example`} className={selectClass} value={language} onChange={(event) => { setLanguage(event.target.value); changeScenario(access.scenario) }}>
              {examples.map((item) => <option key={item.language} value={item.language}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 flex-1 basis-32 gap-2 text-xs text-(--text-secondary)" htmlFor={`${id}-scenario`}>演示状态
            <select id={`${id}-scenario`} className={selectClass} value={access.scenario} onChange={(event) => changeScenario(event.target.value as Scenario)}>
              {scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Button variant="outline" onClick={reopen} className="min-h-11 w-full motion-reduce:transition-none sm:w-auto">模拟重新打开链接</Button>
        </div>
        <p className="text-xs text-(--text-secondary)">{protectedShare ? '演示密码：paste-demo。' : '领取、密码和次数均为本地模拟。'}下载会保存真实的演示文件。</p>
      </div>
    </header>
    <main className="mx-auto max-w-225 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-175 space-y-4">
        <Link href="/" className="inline-block py-2 text-sm text-(--accent-primary) underline underline-offset-4">返回首页</Link>
        {unavailable ? <div role="status" className="flex min-h-100 flex-col items-center justify-center gap-3 text-center">
          <StatusIcon className="size-12 text-(--text-secondary)" aria-hidden="true" />
          <h2 className="text-xl font-semibold">{expired ? '内容已过期' : '查看次数已用完'}</h2>
          <p className="text-sm text-(--text-secondary)">请联系分享者获取新链接。</p>
        </div> : access.claimed ? <>
          {access.remaining !== null ? <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            {access.remaining === 0 ? '这是最后一次查看，当前页面仍可阅读、复制和下载。' : `还可查看 ${access.remaining} 次`}
          </p> : null}
          <DownloadBody key={`${language}-${version}`} example={example} />
        </> : <form onSubmit={claim} className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-8">
          <div className="space-y-2 text-center">
            {protectedShare ? <Lock className="mx-auto size-8 text-(--accent-primary)" aria-hidden="true" /> : <Eye className="mx-auto size-8 text-(--accent-primary)" aria-hidden="true" />}
            <h2 className="text-xl font-semibold">{protectedShare ? '需要访问密码' : '查看分享'}</h2>
            <p className="text-sm text-(--text-secondary)">剩余 {access.remaining} 次，查看后扣 1 次。</p>
          </div>
          {protectedShare ? <div className="space-y-2">
            <label htmlFor={`${id}-password`} className="text-sm text-(--text-secondary)">访问密码</label>
            <Input id={`${id}-password`} type="password" autoComplete="current-password" placeholder="请输入密码…" value={password} onChange={(event) => { setPassword(event.target.value); setError(null) }} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
          </div> : null}
          {error ? <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={protectedShare && !password.trim()} className="min-h-11 w-full motion-reduce:transition-none">{protectedShare ? '解锁内容' : '查看内容'}</Button>
        </form>}
      </div>
    </main>
  </div>
}
