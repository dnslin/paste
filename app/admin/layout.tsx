import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { LogoutButton } from '@/components/admin/logout-button'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-lg font-semibold text-[var(--accent-primary)]">
            Paste Admin
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <ClipboardList className="w-5 h-5" />
            <span>Pastes</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
