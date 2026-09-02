/**
 * Main dashboard page — renders a role-specific dashboard.
 */

import { useAuth } from '@/shared/contexts/AuthContext'
import { HeroBanner } from '@/components/layout'
import DashboardStats from './components/DashboardStats'
import RecentActivity from './components/RecentActivity'
import QuickActions from './components/QuickActions'
import WarehouseDashboard from './WarehouseDashboard'
import InventoryDashboard from './InventoryDashboard'
import ManagerDashboard from './ManagerDashboard'
import AdminDashboard from './AdminDashboard'

const ROLE_DASHBOARDS = {
  warehouse: WarehouseDashboard,
  inventory_staff: InventoryDashboard,
  manager: ManagerDashboard,
  admin: AdminDashboard,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const RoleDashboard = ROLE_DASHBOARDS[user?.role]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <HeroBanner
        title={`Welcome back, ${user?.display_name ?? ''}`}
        subtitle="Here's what's happening with your inventory today"
      />

      {RoleDashboard ? <RoleDashboard /> : <GenericDashboard />}
    </div>
  )
}

// Fallback for any account without a recognized role
function GenericDashboard() {
  return (
    <div className="space-y-6">
      <DashboardStats />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <QuickActions />
      </div>
    </div>
  )
}
