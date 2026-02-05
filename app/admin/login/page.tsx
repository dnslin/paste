import { Shield } from 'lucide-react'
import { LoginForm } from '@/components/admin/login-form'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-base) p-4">
      <div className="w-full max-w-100 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-(--accent-primary)" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-(--text-primary) mb-2">
            Admin Login
          </h1>
          <p className="text-sm text-(--text-secondary)">
            Enter your password to access the admin panel
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
