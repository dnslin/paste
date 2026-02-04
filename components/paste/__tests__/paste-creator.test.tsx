import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PasteCreator } from '../paste-creator'
import { CodeEditor } from '../code-editor'
import { SuccessDialog } from '../success-dialog'

interface MockProps {
  children?: ReactNode
  [key: string]: unknown
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: MockProps) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: MockProps) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: MockProps) => children,
}))

// Mock fetch for API calls
global.fetch = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

describe('PasteCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the create button', () => {
    render(<PasteCreator />)
    expect(screen.getByRole('button', { name: /create paste/i })).toBeInTheDocument()
  })

  it('disables button when textarea is empty', () => {
    render(<PasteCreator />)
    const button = screen.getByRole('button', { name: /create paste/i })
    expect(button).toBeDisabled()
  })

  it('enables button when textarea has content', () => {
    render(<PasteCreator />)
    const textarea = screen.getByTestId('code-editor')
    fireEvent.change(textarea, { target: { value: 'test code' } })
    const button = screen.getByRole('button', { name: /create paste/i })
    expect(button).not.toBeDisabled()
  })
})

describe('CodeEditor', () => {
  it('renders textarea with placeholder', () => {
    render(<CodeEditor value="" onChange={() => {}} language="plaintext" />)
    expect(screen.getByPlaceholderText(/paste your code here/i)).toBeInTheDocument()
  })

  it('displays character count', () => {
    render(<CodeEditor value="hello" onChange={() => {}} language="plaintext" />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('shows Edit and Preview tabs', () => {
    render(<CodeEditor value="" onChange={() => {}} language="plaintext" />)
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^preview$/i })).toBeInTheDocument()
  })

  it('calls onChange when textarea value changes', () => {
    const onChange = vi.fn()
    render(<CodeEditor value="" onChange={onChange} language="plaintext" />)
    const textarea = screen.getByTestId('code-editor')
    fireEvent.change(textarea, { target: { value: 'new content' } })
    expect(onChange).toHaveBeenCalledWith('new content')
  })
})

describe('SuccessDialog', () => {
  const mockUrl = 'https://example.com/abc123'

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders when open', () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )
    expect(screen.getByText(/paste created/i)).toBeInTheDocument()
  })

  it('displays the paste URL', () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )
    expect(screen.getByText(mockUrl)).toBeInTheDocument()
  })

  it('shows copy link button', () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })

  it('shows create another button', () => {
    render(
      <SuccessDialog
        open={true}
        onOpenChange={() => {}}
        url={mockUrl}
        onCreateAnother={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /create another/i })).toBeInTheDocument()
  })
})
