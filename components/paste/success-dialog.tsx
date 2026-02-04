'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Link, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  onCreateAnother: () => void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SuccessDialog({
  open,
  onOpenChange,
  url,
  onCreateAnother,
}: SuccessDialogProps) {
  const [copied, setCopied] = useState(false)
  const [autoCopied, setAutoCopied] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open && url) {
      navigator.clipboard.writeText(url).then(() => setAutoCopied(true))
    }
    if (!open) {
      setCopied(false)
      setAutoCopied(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateAnother = () => {
    onOpenChange(false)
    onCreateAnother()
  }

  const reduced = prefersReducedMotion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.span
              initial={reduced ? {} : { scale: 0 }}
              animate={reduced ? {} : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Sparkles className="size-5 text-[var(--accent-primary)]" />
            </motion.span>
            Paste Created!
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <Link className="size-4 text-[var(--text-tertiary)] shrink-0" />
            <code className="flex-1 text-sm text-[var(--text-primary)] break-all font-mono">
              {url}
            </code>
          </div>

          <AnimatePresence mode="wait">
            {autoCopied && !copied && (
              <motion.p
                initial={reduced ? {} : { opacity: 0, y: -10 }}
                animate={reduced ? {} : { opacity: 1, y: 0 }}
                exit={reduced ? {} : { opacity: 0 }}
                className="text-sm text-[var(--accent-primary)] flex items-center gap-1.5"
              >
                <Check className="size-4" />
                Link copied to clipboard!
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full gap-2"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleCreateAnother} className="w-full sm:w-auto">
            Create Another
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
