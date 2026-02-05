'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { LogoutButton } from '@/components/admin/logout-button'
import { cn } from '@/lib/utils'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-(--bg-base) flex flex-col">
      <nav className="h-16 border-b border-(--border-subtle) bg-(--bg-surface) sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <Link 
                href="/"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) rounded-lg transition-transform hover:scale-105 active:scale-95"
                aria-label="Go to homepage"
              >
                <Image
                  src="/logo.svg"
                  alt="Paste Logo"
                  width={32}
                  height={32}
                  priority
                />
              </Link>
              <Link 
                href="/admin" 
                className="text-lg font-semibold text-(--accent-primary) transition-opacity hover:opacity-90"
              >
                Paste Admin
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-(--text-primary)",
                  pathname === '/admin' 
                    ? "text-(--text-primary)" 
                    : "text-(--text-secondary)"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              
              <div className="w-px h-6 bg-(--border-subtle) mx-2" />
              
              <div className="w-fit">
                <LogoutButton />
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -mr-2 text-(--text-secondary) hover:text-(--text-primary) rounded-md transition-colors"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-(--border-subtle) bg-(--bg-surface)">
            <div className="px-4 pt-2 pb-4 space-y-3">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-(--bg-elevated)",
                  pathname === '/admin'
                    ? "text-(--text-primary) bg-(--bg-elevated)"
                    : "text-(--text-secondary) hover:text-(--text-primary)"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              <div className="border-t border-(--border-subtle) my-2" />
              
              <div className="px-1">
                <LogoutButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
