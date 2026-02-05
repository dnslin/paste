import { StatsCards } from '@/components/admin/stats-cards'
import { PastesTable } from '@/components/admin/pastes-table'
import { TrendChart } from '@/components/admin/trend-chart'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-(--text-primary)">Dashboard</h1>
      
      <StatsCards />
      
      <TrendChart />
      
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-(--text-primary)">Recent Pastes</h2>
        <PastesTable />
      </div>
    </div>
  )
}
