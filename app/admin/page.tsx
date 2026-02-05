import { DashboardStats } from '@/components/admin/dashboard-stats'
import { PastesTable } from '@/components/admin/pastes-table'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-(--text-primary)">Dashboard</h1>
      
      <DashboardStats />
      
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-(--text-primary)">Recent Pastes</h2>
        <PastesTable />
      </div>
    </div>
  )
}
