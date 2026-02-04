'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
      <div className="relative w-full sm:w-[200px]">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Optional password"
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
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <Select value={expiryValue} onValueChange={handleExpiryChange}>
        <SelectTrigger data-testid="expiry-select" className="w-full sm:w-[140px]">
          <SelectValue placeholder="过期时间" />
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

      <Select value={burnValue} onValueChange={handleBurnChange}>
        <SelectTrigger data-testid="burn-select" className="w-full sm:w-[140px]">
          <SelectValue placeholder="阅后即焚" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="off">关闭</SelectItem>
          <SelectItem value="1">1次</SelectItem>
          <SelectItem value="3">3次</SelectItem>
          <SelectItem value="5">5次</SelectItem>
          <SelectItem value="10">10次</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
