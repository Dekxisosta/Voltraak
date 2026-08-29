/**
 * Manager dashboard
 * Business-level KPIs plus quick redirects into manager-exclusive tabs
 * (KPI, forecast, reports, low stock, PO approvals, users) and into the
 * warehouse/inventory sections manager oversees.
 */

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  FileBarChart,
  BarChart3,
  AlertCircle,
  ShoppingCart,
  Users,
  Truck,
  ArrowUpDown,
} from 'lucide-react'
import { formatCompactCurrency, formatCompactNumber } from '@/shared/utils'
import { createResourceDataSource } from '@/shared/services/dataSource'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import AlertsPanel from './components/AlertsPanel'

// Same source POApprovalsPage.jsx reads/writes — subscribing here means an
// approve/reject on that page updates this card immediately, without a
// dashboard reload.
const poApprovalsSource = createResourceDataSource('manager/po-approvals')

function buildStats(poOrders) {
  const pending = poOrders.filter((o) => o.status === 'pending')
  const highValuePending = pending.filter((o) => o.total_amount > 50000)

  return [
    {
      title: 'Pending PO Approvals',
      value: formatCompactNumber(pending.length),
      change: `${highValuePending.length} over ₱50,000`,
      changeType: 'neutral',
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      title: 'Monthly Revenue',
      value: formatCompactCurrency(125430),
      change: '+8.1% vs last month',
      changeType: 'increase',
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Cost Savings',
      value: formatCompactCurrency(8250),
      change: 'from reorder optimization',
      changeType: 'increase',
      icon: FileBarChart,
      color: 'blue',
    },
    {
      title: 'Low Stock Items',
      value: formatCompactNumber(23),
      change: 'across all warehouses',
      changeType: 'decrease',
      icon: AlertCircle,
      color: 'red',
    },
  ]
}

const managerRedirectItems = [
  {
    label: 'KPI Dashboard',
    description: 'Track performance at a glance',
    basePath: '/manager',
    tab: 'kpi',
    icon: TrendingUp,
    color: 'green',
  },
  {
    label: 'Forecast Reports',
    description: 'Plan ahead with demand forecasts',
    basePath: '/manager',
    tab: 'forecast',
    icon: FileBarChart,
    color: 'blue',
  },
  {
    label: 'Inventory Reports',
    description: 'Deep-dive into stock analytics',
    basePath: '/manager',
    tab: 'reports',
    icon: BarChart3,
    color: 'purple',
  },
  {
    label: 'Low Stock Alerts',
    description: 'See what needs reordering',
    basePath: '/manager',
    tab: 'low-stock',
    icon: AlertCircle,
    color: 'red',
  },
  {
    label: 'PO Approvals',
    description: 'Approve or reject purchase orders',
    basePath: '/manager',
    tab: 'po-approvals',
    icon: ShoppingCart,
    color: 'amber',
  },
  {
    label: 'User Management',
    description: 'Manage staff accounts and roles',
    basePath: '/manager',
    tab: 'users',
    icon: Users,
    color: 'blue',
  },
]

const oversightRedirectItems = [
  {
    label: 'Warehouse: Picking Lists',
    description: 'Check outbound fulfillment status',
    basePath: '/warehouse',
    tab: 'picking',
    icon: Truck,
    color: 'blue',
  },
  {
    label: 'Inventory: Stock Levels',
    description: 'Check current on-hand quantities',
    basePath: '/inventory',
    tab: 'stock-levels',
    icon: ArrowUpDown,
    color: 'green',
  },
]

const colorClasses = {
  blue: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  green: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  yellow: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  red: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  purple: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
}

export default function ManagerDashboard() {
  const [poOrders, setPoOrders] = useState([])

  useEffect(() => {
    return poApprovalsSource.subscribe(setPoOrders)
  }, [])

  const stats = buildStats(poOrders)

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>

        <QuickRedirects title="Manager Tabs" items={managerRedirectItems} />
        <QuickRedirects title="Team Oversight" items={oversightRedirectItems} />

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
