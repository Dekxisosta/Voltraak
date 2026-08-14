/**
 * Main dashboard page with role-based content
 */

import { useAuth } from '@/contexts/AuthContext'
import { ConditionalRender } from '@/components/common/ProtectedRoute'
import DashboardStats from './components/DashboardStats'
import RecentActivity from './components/RecentActivity'
import QuickActions from './components/QuickActions'
import AlertsPanel from './components/AlertsPanel'

export default function DashboardPage() {
  const { user } = useAuth()

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

      {/* Dashboard content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats overview */}
          <DashboardStats />

          {/* Recent activity */}
          <RecentActivity />
        </div>

        {/* Sidebar content */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick actions */}
          <QuickActions />

          {/* Alerts panel */}
          <AlertsPanel />

          {/* Role-specific widgets */}
          <ConditionalRender roles={['manager']}>
            <ManagerWidgets />
          </ConditionalRender>

          <ConditionalRender roles={['inventory_staff']}>
            <InventoryStaffWidgets />
          </ConditionalRender>

          <ConditionalRender roles={['warehouse']}>
            <WarehouseWidgets />
          </ConditionalRender>
        </div>
      </div>
    </div>
  )
}

// Role-specific widget components (to be implemented)
function ManagerWidgets() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Manager Overview</h3>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Pending Approvals</span>
            <span className="text-sm font-medium text-gray-900">5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Monthly Revenue</span>
            <span className="text-sm font-medium text-gray-900">₱125,430</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Cost Savings</span>
            <span className="text-sm font-medium text-green-600">₱8,250</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function InventoryStaffWidgets() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Today's Tasks</h3>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Physical Counts Due</span>
            <span className="status-badge status-badge-warning">3 items</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Reorder Points</span>
            <span className="status-badge status-badge-critical">2 items</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Batch Reviews</span>
            <span className="status-badge status-badge-ok">All clear</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WarehouseWidgets() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Warehouse Status</h3>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Pending Receipts</span>
            <span className="text-sm font-medium text-gray-900">8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Active Picks</span>
            <span className="text-sm font-medium text-gray-900">12</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">FEFO Priority</span>
            <span className="status-badge status-badge-warning">5 batches</span>
          </div>
        </div>
      </div>
    </div>
  )
}