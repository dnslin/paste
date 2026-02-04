'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Loader2, Send } from 'lucide-react'
import { CodeEditor } from '@/components/paste/code-editor'
import { LanguageSelector } from '@/components/paste/language-selector'
import { OptionsPanel, type PasteOptions } from './options-panel'
import { SuccessDialog } from './success-dialog'
import { Button } from '@/components/ui/button'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const containerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
}

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const noMotion: Variants = {
  initial: {},
  animate: {},
}

export function PasteCreator() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [options, setOptions] = useState<PasteOptions>({
    password: '',
    expiresIn: 1440,
    burnAfterRead: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ id: string; url: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = async () => {
    if (!code.trim() || isLoading) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: code,
          language,
          password: options.password || undefined,
          expiresIn: options.expiresIn,
          burnAfterRead: options.burnAfterRead,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
        setDialogOpen(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAnother = () => {
    setCode('')
    setLanguage('plaintext')
    setOptions({ password: '', expiresIn: 1440, burnAfterRead: null })
    setResult(null)
  }

  const reduced = prefersReducedMotion()
  const stagger = reduced ? noMotion : containerVariants
  const fadeUp = reduced ? noMotion : itemVariants

  return (
    <motion.div
      className="flex flex-col gap-4 sm:gap-5 w-full"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Language
          </span>
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <CodeEditor value={code} onChange={setCode} language={language} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <OptionsPanel value={options} onChange={setOptions} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button
          onClick={handleCreate}
          disabled={!code.trim() || isLoading}
          className="w-full gap-2 h-11"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Create Paste
            </>
          )}
        </Button>
      </motion.div>

      {result && (
        <SuccessDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          url={result.url}
          onCreateAnother={handleCreateAnother}
        />
      )}
    </motion.div>
  )
}
