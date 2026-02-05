import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { SuccessDialog } from '../success-dialog'

interface MockProps {
  children?: ReactNode
  [key: string]: unknown
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: MockProps) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: MockProps) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: MockProps) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: MockProps) => children,
}))

describe('Copy Functionality', () => {
  const mockUrl = 'https://paste.example.com/abc123'
  let clipboardWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteText,
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('auto-copies URL to clipboard when dialog opens', async () => {
    vi.useRealTimers()
    
    const { rerender } = render(
      <SuccessDialog
        open={false}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    rerender(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(mockUrl)
    })
    
    vi.useFakeTimers()
  })

  it('shows "Link copied to clipboard!" message after auto-copy', async () => {
    vi.useRealTimers()
    
    const { rerender } = render(
      <SuccessDialog
        open={false}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    rerender(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/link copied to clipboard/i)).toBeInTheDocument()
    })
    
    vi.useFakeTimers()
  })

  it('copies URL when copy button is clicked', async () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    // Clear the auto-copy call
    clipboardWriteText.mockClear()

    const copyButton = screen.getByRole('button', { name: /copy link/i })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(clipboardWriteText).toHaveBeenCalledWith(mockUrl)
  })

  it('shows "Copied!" text after clicking copy button', async () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    const copyButton = screen.getByRole('button', { name: /copy link/i })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(screen.getByText(/copied!/i)).toBeInTheDocument()
  })

  it('reverts to "Copy Link" after 2 seconds', async () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )

    const copyButton = screen.getByRole('button', { name: /copy link/i })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(screen.getByText(/copied!/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })

  it('calls onCreateAnother when "Create Another" button is clicked', async () => {
    const onCreateAnother = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <SuccessDialog
        open={true}
        onOpenChange={onOpenChange}
        url={mockUrl}
        onCreateAnother={onCreateAnother}
      />
    )

    const createAnotherButton = screen.getByRole('button', { name: /create another/i })
    fireEvent.click(createAnotherButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onCreateAnother).toHaveBeenCalled()
  })
})
