/**
 * Main dashboard page — renders a role-specific dashboard.
 *
 * Pushes AlertsPanel into the AppShell's right panel slot so it appears
 * in the 260px right column of the 3-column shell layout. The slot is
 * cleared on unmount so other pages get a clean right panel.
 */

import { useEffect } from 'react'
import { useAuth } from '@/shared/contexts/AuthContext'
import { HeroBanner } from '@/components/layout'
import { useAppShell } from '@/components/layout'
import RightPanel, { RightPanelSection } from '@/components/layout/RightPanel'
import AlertsPanel from './components/AlertsPanel'
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
  const { setRightPanel } = useAppShell()

  // Mount AlertsPanel into the shell's right column for the duration of
  // this page. Clean up on unmount so other pages get an empty right panel.
  useEffect(() => {
    setRightPanel(
      <RightPanel>
        <RightPanelSection title="Alerts">
          <AlertsPanel />
        </RightPanelSection>
      </RightPanel>
    )
    return () => setRightPanel(null)
  }, [setRightPanel])

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
