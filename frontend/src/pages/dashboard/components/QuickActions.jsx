/**
 * Quick actions panel for common tasks
 */

import { Plus, Search, FileText, Users } from 'lucide-react'
import { ConditionalRender } from '@/shared/components/common/ProtectedRoute'

export default function QuickActions() {
  const quickActions = [
    {
      label: 'Stock In',
      description: 'Record new inventory',
      icon: Plus,
      onClick: () => console.log('Navigate to stock in'),
      roles: ['warehouse', 'inventory_staff', 'manager'],
    },
    {
      label: 'Search Products',
      description: 'Find items quickly',
      icon: Search,
      onClick: () => console.log('Navigate to product search'),
    },
    {
      label: 'Generate Report',
      description: 'Create inventory reports',
      icon: FileText,
      onClick: () => console.log('Navigate to reports'),
      roles: ['inventory_staff', 'manager'],
    },
    {
      label: 'Manage Users',
      description: 'User administration',
      icon: Users,
      onClick: () => console.log('Navigate to user management'),
      roles: ['manager'],
    },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Common tasks and shortcuts</p>
      </div>
      <div className="card-body">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {quickActions.map((action, index) => (
            <ConditionalRender key={index} roles={action.roles}>
              <QuickActionButton action={action} />
            </ConditionalRender>
          ))}
        </div>
      </div>
    </div>
  )
}



function QuickActionButton({ action }) {
  return (
    <button
      onClick={action.onClick}
      className="
        group relative overflow-hidden rounded-lg p-4 text-left transition-colors
        border border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-500
      "
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
          <action.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
        </div>
      </div>
    </button>
  )
}