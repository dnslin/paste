'use client'

import { useState } from 'react'
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
        <p className="text-xs text-(--text-muted)">访问时需要输入密码</p>
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
          <SelectContent>
            <SelectItem value="5">5分钟</SelectItem>
            <SelectItem value="30">30分钟</SelectItem>
            <SelectItem value="60">1小时</SelectItem>
            <SelectItem value="1440">1天</SelectItem>
            <SelectItem value="10080">7天</SelectItem>
            <SelectItem value="43200">30天</SelectItem>
            <SelectItem value="never">永不过期</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-(--text-muted)">到期后自动删除</p>
      </div>

      {/* Burn After Read */}
      <div className="space-y-2">
        <label id="burn-label" className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
          <Flame className="size-4" />
          阅后即焚
        </label>
        <Select value={burnValue} onValueChange={handleBurnChange}>
          <SelectTrigger data-testid="burn-select" aria-labelledby="burn-label" className="w-full">
            <SelectValue placeholder="选择查看次数" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">关闭</SelectItem>
            <SelectItem value="1">1次后删除</SelectItem>
            <SelectItem value="3">3次后删除</SelectItem>
            <SelectItem value="5">5次后删除</SelectItem>
            <SelectItem value="10">10次后删除</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-(--text-muted)">达到次数后自动删除</p>
      </div>
    </div>
  )
}
