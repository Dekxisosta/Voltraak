/**
 * Inventory Staff dashboard
 * Surfaces stock levels/movements/reservations/expiry status and links
 * straight into the Inventory section's tabs.
 */

import { ArrowUpDown, BarChart3, AlertCircle, Package, Calendar } from 'lucide-react'
import { formatNumber } from '@/shared/utils'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import AlertsPanel from './components/AlertsPanel'

const stats = [
  {
    title: 'Total Products Tracked',
    value: formatNumber(1247),
    change: '+12 this week',
    changeType: 'increase',
    icon: Package,
    color: 'blue',
  },
  {
    title: 'Low Stock Items',
    value: 23,
    change: '-5 from yesterday',
    changeType: 'decrease',
    icon: BarChart3,
    color: 'yellow',
  },
  {
    title: 'Open Reservations',
    value: 9,
    change: '3 expiring today',
    changeType: 'neutral',
    icon: ArrowUpDown,
    color: 'purple',
  },
  {
    title: 'Batches Nearing Expiry',
    value: 5,
    change: 'within 7 days',
    changeType: 'decrease',
    icon: Calendar,
    color: 'red',
  },
]

const quickRedirectItems = [
  {
    label: 'Stock In/Out',
    description: 'Record inventory movement',
    basePath: '/inventory',
    tab: 'stock-in-out',
    icon: ArrowUpDown,
    color: 'blue',
  },
  {
    label: 'Stock Levels',
    description: 'Check current on-hand quantities',
    basePath: '/inventory',
    tab: 'stock-levels',
    icon: BarChart3,
    color: 'green',
  },
  {
    label: 'Damage Reports',
    description: 'Log damaged or written-off stock',
    basePath: '/inventory',
    tab: 'damage-report',
    icon: AlertCircle,
    color: 'red',
  },
  {
    label: 'Item Updates',
    description: 'Edit product details and attributes',
    basePath: '/inventory',
    tab: 'item-update',
    icon: Package,
    color: 'purple',
  },
  {
    label: 'Reservations',
    description: 'Manage held stock for orders',
    basePath: '/inventory',
    tab: 'reservations',
    icon: Package,
    color: 'amber',
  },
  {
    label: 'Expiry Alerts',
    description: 'Review upcoming batch expirations',
    basePath: '/inventory',
    tab: 'expiry-alerts',
    icon: Calendar,
    color: 'yellow',
  },
]

const colorClasses = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
}

export default function InventoryDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>

        <QuickRedirects title="Inventory Tabs" items={quickRedirectItems} />

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
