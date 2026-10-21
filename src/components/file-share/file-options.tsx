'use client'

import { useId, useState } from 'react'
import { Clock, Download, Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPasswordError } from '@/lib/paste-rules'
import { ShareSettings, formatSettingsSummary } from '@/components/share-settings'
import type { FileShareOptions } from './presentation'

export function FileOptions({ value, onChange, disabled }: { value: FileShareOptions; onChange: (value: FileShareOptions) => void; disabled: boolean }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const passwordError = getPasswordError(value.password)

  return <ShareSettings summary={formatSettingsSummary(value.expiresIn, value.downloadLimit, !!value.password, '下载')} disabled={disabled} invalid={!!passwordError}>
    <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
    <legend className="sr-only">文件分享选项</legend>
    <div className="space-y-2">
      <label htmlFor={`${id}-password`} className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)"><Lock className="size-4" aria-hidden="true" />密码保护</label>
      <div className="relative">
        <Input id={`${id}-password`} type={visible ? 'text' : 'password'} value={value.password} placeholder="可选" onChange={(event) => onChange({ ...value, password: event.target.value })} className="pr-10"
          aria-invalid={!!passwordError} aria-describedby={passwordError ? `${id}-password-help` : undefined} autoComplete="new-password" />
        <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏密码' : '显示密码'}>
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {passwordError ? <p id={`${id}-password-help`} role="alert" className="text-xs text-red-400">{passwordError}</p> : null}
    </div>
    <div className="space-y-2">
      <span id={`${id}-expiry`} className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)"><Clock className="size-4" aria-hidden="true" />有效期</span>
      <Select value={String(value.expiresIn)} onValueChange={(minutes) => onChange({ ...value, expiresIn: Number(minutes) })} disabled={disabled}>
        <SelectTrigger aria-labelledby={`${id}-expiry`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className="animate-none!"><SelectItem value="5">5 分钟</SelectItem><SelectItem value="30">30 分钟</SelectItem><SelectItem value="60">1 小时</SelectItem><SelectItem value="1440">1 天</SelectItem><SelectItem value="10080">7 天</SelectItem></SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <span id={`${id}-limit`} className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)"><Download className="size-4" aria-hidden="true" />下载次数</span>
      <Select value={value.downloadLimit === null ? 'off' : String(value.downloadLimit)} onValueChange={(limit) => onChange({ ...value, downloadLimit: limit === 'off' ? null : Number(limit) })} disabled={disabled}>
        <SelectTrigger aria-labelledby={`${id}-limit`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className="animate-none!"><SelectItem value="off">不限次数</SelectItem><SelectItem value="1">1 次</SelectItem><SelectItem value="3">3 次</SelectItem><SelectItem value="5">5 次</SelectItem><SelectItem value="10">10 次</SelectItem></SelectContent>
      </Select>
    </div>
  </fieldset>
  </ShareSettings>
}
