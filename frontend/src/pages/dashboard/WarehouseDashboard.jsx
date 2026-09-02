/**
 * Warehouse Staff dashboard
 * Surfaces receiving/picking/FEFO status and links straight into the
 * Warehouse section's tabs. Discrepancies are tracked here only as "your
 * reports awaiting review" — Warehouse raises concerns but Inventory owns
 * investigation/resolution (see pages/inventory/discrepancies).
 */

import { useEffect, useState } from 'react'
import { Truck, Package, Calendar, AlertCircle } from 'lucide-react'
import { createResourceDataSource } from '@/shared/services/dataSource'
import { formatCompactNumber } from '@/shared/utils'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'

// Same resource Inventory's DiscrepanciesPage reads/writes — subscribing
// here means a status change there updates this card immediately, without
// a dashboard reload. Filtered to reports Warehouse itself submitted.
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')

function buildStats(discrepancies) {
  const ownReports = discrepancies.filter((d) => d.reported_by === 'Warehouse Staff')
  const awaitingReview = ownReports.filter((d) => d.status === 'open')

  return [
    {
      title: 'Pending Receipts',
      value: formatCompactNumber(8),
      change: '3 due today',
      changeType: 'neutral',
      icon: Truck,
      color: 'blue',
    },
    {
      title: 'Active Picks',
      value: formatCompactNumber(12),
      change: '4 ready to pack',
      changeType: 'neutral',
      icon: Package,
      color: 'green',
    },
    {
      title: 'FEFO Priority Batches',
      value: formatCompactNumber(5),
      change: 'expiring within 7 days',
      changeType: 'decrease',
      icon: Calendar,
      color: 'yellow',
    },
    {
      title: 'Reports Awaiting Review',
      value: formatCompactNumber(awaitingReview.length),
      change: awaitingReview.length > 0 ? `${awaitingReview.filter((d) => d.priority === 'high').length} high priority` : null,
      changeType: 'decrease',
      icon: AlertCircle,
      color: 'red',
    },
  ]
}

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
    label: 'Report Discrepancy',
    description: 'Flag a stock count mismatch',
    basePath: '/warehouse',
    tab: 'report-discrepancy',
    icon: AlertCircle,
    color: 'red',
  },
]

const colorClasses = {
  blue: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  green: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  yellow: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  red: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
}

export default function WarehouseDashboard() {
  const [discrepancies, setDiscrepancies] = useState([])

  useEffect(() => {
    return discrepanciesSource.subscribe(setDiscrepancies)
  }, [])

  const stats = buildStats(discrepancies)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <QuickRedirects title="Warehouse Tabs" items={quickRedirectItems} />

      <RecentActivity />
    </div>
  )
}

function StatCard({ stat }) {
  const colors = colorClasses[stat.color]

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`p-2 rounded-md flex-shrink-0 ${colors.bg} ${colors.border} border`}>
            <stat.icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{stat.value}</p>
            {stat.change && (
              <p
                className={`text-xs mt-1 truncate ${
                  stat.changeType === 'increase'
                    ? 'text-gray-600 dark:text-gray-400'
                    : stat.changeType === 'decrease'
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-500 dark:text-gray-400'
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
