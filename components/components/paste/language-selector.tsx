'use client'

import * as React from 'react'
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
  const [open, setOpen] = React.useState(false)

  const selectedLanguage = LANGUAGES.find((lang) => lang.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          data-testid="language-selector"
        >
          <span className="flex items-center gap-2">
            <Code2 className="size-4" />
            {selectedLanguage?.name ?? 'Plain Text'}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          filter={(value, search) => {
            const lang = LANGUAGES.find((l) => l.id === value)
            if (!lang) return 0
            const searchLower = search.toLowerCase()
            if (lang.name.toLowerCase().includes(searchLower)) return 1
            if (lang.id.toLowerCase().includes(searchLower)) return 1
            if (lang.aliases?.some((a) => a.toLowerCase().includes(searchLower))) return 1
            return 0
          }}
        >
          <CommandInput placeholder="Search language..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {LANGUAGES.map((lang) => (
                <CommandItem
                  key={lang.id}
                  value={lang.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
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
