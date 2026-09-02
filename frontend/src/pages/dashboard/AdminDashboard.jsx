/**
 * Admin dashboard
 * Admin has access to every route in the app (admin + manager + inventory +
 * warehouse), so this dashboard surfaces business KPIs plus quick
 * redirects into all sections at once, to showcase every feature.
 */

import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  TrendingUp,
  FileBarChart,
  BarChart3,
  AlertCircle,
  ShoppingCart,
  Users,
  ClipboardCheck,
  Truck,
  Package,
  Calendar,
  ArrowUpDown,
} from 'lucide-react'
import { formatCompactCurrency, formatCompactNumber } from '@/shared/utils'
import { createResourceDataSource } from '@/shared/services/dataSource'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import WhatsNew from './components/WhatsNew'
import RelatedLinks from './components/RelatedLinks'

// Same sources the manager/warehouse/inventory dashboards subscribe to —
// keeps this overview live with mutations made anywhere in the app.
const poApprovalsSource = createResourceDataSource('manager/po-approvals')
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')

function buildStats(poOrders, discrepancies) {
  const pending = poOrders.filter((o) => o.status === 'pending')
  const openDiscrepancies = discrepancies.filter((d) => d.status === 'open' || d.status === 'investigating')

  return [
    {
      title: 'Pending PO Approvals',
      value: formatCompactNumber(pending.length),
      change: 'across all suppliers',
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
      title: 'Open Discrepancies',
      value: formatCompactNumber(openDiscrepancies.length),
      change: 'inventory + warehouse',
      changeType: 'decrease',
      icon: AlertCircle,
      color: 'red',
    },
    {
      title: 'Active Picks',
      value: formatCompactNumber(12),
      change: '4 ready to pack',
      changeType: 'neutral',
      icon: Package,
      color: 'blue',
    },
  ]
}

const adminRedirectItems = [
  {
    label: 'User Management',
    description: 'Create, edit, deactivate, and delete system accounts',
    basePath: '/admin',
    tab: 'users',
    icon: Users,
    color: 'blue',
  },
]

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
    label: 'Adjustment Approvals',
    description: 'Review stock adjustment requests',
    basePath: '/manager',
    tab: 'adjustment-approvals',
    icon: ClipboardCheck,
    color: 'purple',
  },
]

const inventoryRedirectItems = [
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
    label: 'Item Updates',
    description: 'Edit product details and attributes',
    basePath: '/inventory',
    tab: 'item-update',
    icon: Package,
    color: 'purple',
  },
  {
    label: 'Discrepancies',
    description: 'Investigate and resolve count mismatches',
    basePath: '/inventory',
    tab: 'discrepancies',
    icon: AlertCircle,
    color: 'red',
  },
]

const warehouseRedirectItems = [
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
]

const colorClasses = {
  blue: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  green: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  yellow: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  red: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  purple: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
}

export default function AdminDashboard() {
  const [poOrders, setPoOrders] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])

  useEffect(() => {
    const unsubscribers = [
      poApprovalsSource.subscribe(setPoOrders),
      discrepanciesSource.subscribe(setDiscrepancies),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  const stats = buildStats(poOrders, discrepancies)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You're signed in as an administrator — every section of Voltraak is available below.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <WhatsNew />

      <RelatedLinks />

      <QuickRedirects title="Admin" items={adminRedirectItems} />
      <QuickRedirects title="Manager Tabs" items={managerRedirectItems} />
      <QuickRedirects title="Inventory Tabs" items={inventoryRedirectItems} />
      <QuickRedirects title="Warehouse Tabs" items={warehouseRedirectItems} />

      <WhatsNew />

      <RelatedLinks />

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
