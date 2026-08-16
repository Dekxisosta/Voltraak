/**
 * Warehouse Staff dashboard
 * Surfaces receiving/picking/FEFO/discrepancy status and links straight
 * into the Warehouse section's tabs.
 */

import { Truck, Package, Calendar, AlertCircle } from 'lucide-react'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import AlertsPanel from './components/AlertsPanel'

const stats = [
  {
    title: 'Pending Receipts',
    value: 8,
    change: '3 due today',
    changeType: 'neutral',
    icon: Truck,
    color: 'blue',
  },
  {
    title: 'Active Picks',
    value: 12,
    change: '4 ready to pack',
    changeType: 'neutral',
    icon: Package,
    color: 'green',
  },
  {
    title: 'FEFO Priority Batches',
    value: 5,
    change: 'expiring within 7 days',
    changeType: 'decrease',
    icon: Calendar,
    color: 'yellow',
  },
  {
    title: 'Open Discrepancies',
    value: 2,
    change: '-1 from yesterday',
    changeType: 'decrease',
    icon: AlertCircle,
    color: 'red',
  },
]

const quickRedirectItems = [
  {
    label: 'Receiving',
    description: 'Log incoming shipments',
    basePath: '/warehouse',
    tab: 'receiving',
    icon: Truck,
    color: 'blue',
  },
  {
    label: 'Picking Lists',
    description: 'Fulfill outbound orders',
    basePath: '/warehouse',
    tab: 'picking',
    icon: Package,
    color: 'green',
  },
  {
    label: 'FEFO Management',
    description: 'Prioritize soon-to-expire batches',
    basePath: '/warehouse',
    tab: 'fefo',
    icon: Calendar,
    color: 'yellow',
  },
  {
    label: 'Discrepancies',
    description: 'Review counting mismatches',
    basePath: '/warehouse',
    tab: 'discrepancies',
    icon: AlertCircle,
    color: 'red',
  },
]

const colorClasses = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
}

export default function WarehouseDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>

        <QuickRedirects title="Warehouse Tabs" items={quickRedirectItems} />

        <RecentActivity />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <AlertsPanel />
      </div>
    </div>
  )
}

function StatCard({ stat }) {
  const colors = colorClasses[stat.color]

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`p-2 rounded-md ${colors.bg} ${colors.border} border`}>
            <stat.icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.change && (
              <p
                className={`text-xs mt-1 ${
                  stat.changeType === 'increase'
                    ? 'text-green-600'
                    : stat.changeType === 'decrease'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.change}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
