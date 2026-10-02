'use client'

import { useState } from 'react'
import { getPasswordError } from '@/lib/paste-rules'
import { Eye, EyeOff, Lock, Clock, Flame } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PasteOptions {
  password: string
  expiresIn: number | null
  burnAfterRead: number | null
}

interface OptionsPanelProps {
  value: PasteOptions
  onChange: (options: PasteOptions) => void
}

export function OptionsPanel({ value, onChange }: OptionsPanelProps) {
  const [showPassword, setShowPassword] = useState(false)
  const passwordError = getPasswordError(value.password)

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, password: e.target.value })
  }

  const handleExpiryChange = (val: string) => {
    onChange({ ...value, expiresIn: val === 'never' ? null : parseInt(val, 10) })
  }

  const handleBurnChange = (val: string) => {
    onChange({ ...value, burnAfterRead: val === 'off' ? null : parseInt(val, 10) })
  }

  const expiryValue = value.expiresIn === null ? 'never' : String(value.expiresIn)
  const burnValue = value.burnAfterRead === null ? 'off' : String(value.burnAfterRead)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Password Protection */}
      <div className="space-y-2">
        <label htmlFor="password-input" className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
          <Lock className="size-4" />
          密码保护
        </label>
        <div className="relative">
          <Input
            id="password-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="留空则不设密码"
            value={value.password}
            onChange={handlePasswordChange}
            data-testid="password-input"
            className="pr-10"
            aria-invalid={!!passwordError}
            aria-describedby="password-help"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            data-testid="toggle-password"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p id="password-help" className={passwordError ? "text-xs text-red-400" : "text-xs text-(--text-secondary)"}>{passwordError || "访问时需要输入密码，最多 72 个 UTF-8 字节。"}</p>
      </div>

      {/* Expiration Time */}
      <div className="space-y-2">
        <label id="expiry-label" className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
          <Clock className="size-4" />
          过期时间
        </label>
        <Select value={expiryValue} onValueChange={handleExpiryChange}>
          <SelectTrigger data-testid="expiry-select" aria-labelledby="expiry-label" className="w-full">
            <SelectValue placeholder="选择过期时间" />
          </SelectTrigger>
          <SelectContent className="animate-none!">
            <SelectItem value="5">5分钟</SelectItem>
            <SelectItem value="30">30分钟</SelectItem>
            <SelectItem value="60">1小时</SelectItem>
            <SelectItem value="1440">1天</SelectItem>
            <SelectItem value="10080">7天</SelectItem>
            <SelectItem value="43200">30天</SelectItem>
            <SelectItem value="never">永不过期</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-(--text-secondary)">到期后停止公开访问</p>
      </div>

      {/* Burn After Read */}
      <div className="space-y-2">
        <label id="burn-label" className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
          <Flame className="size-4" />
          查看次数限制
        </label>
        <Select value={burnValue} onValueChange={handleBurnChange}>
          <SelectTrigger data-testid="burn-select" aria-labelledby="burn-label" className="w-full">
            <SelectValue placeholder="选择查看次数" />
          </SelectTrigger>
          <SelectContent className="animate-none!">
            <SelectItem value="off">关闭</SelectItem>
            <SelectItem value="1">1 次</SelectItem>
            <SelectItem value="3">3 次</SelectItem>
            <SelectItem value="5">5 次</SelectItem>
            <SelectItem value="10">10 次</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-(--text-secondary)">次数用完后停止公开访问</p>
      </div>
    </div>
  )
}
