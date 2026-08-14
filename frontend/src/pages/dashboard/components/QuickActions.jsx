/**
 * Quick actions panel for common tasks
 */

import { Plus, Search, FileText, Users } from 'lucide-react'
import { ConditionalRender } from '@/components/common/ProtectedRoute'

const colorClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
}

export default function QuickActions() {
  const quickActions = [
    {
      label: 'Stock In',
      description: 'Record new inventory',
      icon: Plus,
      onClick: () => console.log('Navigate to stock in'),
      roles: ['warehouse', 'inventory_staff', 'manager'],
      color: 'blue',
    },
    {
      label: 'Search Products',
      description: 'Find items quickly',
      icon: Search,
      onClick: () => console.log('Navigate to product search'),
      color: 'green',
    },
    {
      label: 'Generate Report',
      description: 'Create inventory reports',
      icon: FileText,
      onClick: () => console.log('Navigate to reports'),
      roles: ['inventory_staff', 'manager'],
      color: 'purple',
    },
    {
      label: 'Manage Users',
      description: 'User administration',
      icon: Users,
      onClick: () => console.log('Navigate to user management'),
      roles: ['manager'],
      color: 'orange',
    },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Common tasks and shortcuts</p>
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
      className={`
        group relative overflow-hidden rounded-lg p-4 text-left transition-all
        ${colorClasses[action.color]} text-white
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
    >
      <div className="flex items-center space-x-3">
        <action.icon className="h-6 w-6 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{action.label}</p>
          <p className="text-xs opacity-90">{action.description}</p>
        </div>
      </div>
    </button>
  )
}