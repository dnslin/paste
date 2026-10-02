'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Code2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LANGUAGES } from '@/lib/languages'

interface LanguageSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedLanguage = LANGUAGES.find((lang) => lang.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="code-language"
          role="combobox"
          aria-expanded={open}
          className="w-50 justify-between"
          data-testid="language-selector"
        >
          <span className="flex items-center gap-2">
            <Code2 className="size-4" />
            {selectedLanguage?.name ?? '纯文本'}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0 animate-none!">
        <Command>
          <CommandInput placeholder="搜索语言或别名…" aria-label="搜索代码语言" />
          <CommandList className="max-h-75">
            <CommandEmpty>未找到对应语言</CommandEmpty>
            <CommandGroup>
              {LANGUAGES.map((lang) => (
                <CommandItem
                  key={lang.id}
                  value={lang.id}
                  keywords={[lang.name, ...lang.aliases]}
                  onSelect={() => {
                    onChange(lang.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === lang.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {lang.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
