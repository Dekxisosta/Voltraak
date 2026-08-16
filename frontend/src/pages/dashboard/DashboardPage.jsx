/**
 * Main dashboard page — renders a role-specific dashboard.
 * Each role (warehouse, inventory_staff, manager) gets its own stats,
 * activity feed, and quick redirects into its specialized tabs.
 */

import { useAuth } from '@/shared/contexts/AuthContext'
import WarehouseDashboard from './WarehouseDashboard'
import InventoryDashboard from './InventoryDashboard'
import ManagerDashboard from './ManagerDashboard'
import DashboardStats from './components/DashboardStats'
import RecentActivity from './components/RecentActivity'
import QuickActions from './components/QuickActions'
import AlertsPanel from './components/AlertsPanel'

const ROLE_DASHBOARDS = {
  warehouse: WarehouseDashboard,
  inventory_staff: InventoryDashboard,
  manager: ManagerDashboard,
}

export default function DashboardPage() {
  const { user } = useAuth()

  const RoleDashboard = ROLE_DASHBOARDS[user?.role]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.display_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your inventory today
        </p>
      </div>

      {RoleDashboard ? <RoleDashboard /> : <GenericDashboard />}
    </div>
  )
}

// Fallback for any account without a recognized role
function GenericDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <DashboardStats />
        <RecentActivity />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <QuickActions />
        <AlertsPanel />
      </div>
    </div>
  )
}
