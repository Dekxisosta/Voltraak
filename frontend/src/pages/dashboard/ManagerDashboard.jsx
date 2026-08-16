/**
 * Manager dashboard
 * Business-level KPIs plus quick redirects into manager-exclusive tabs
 * (KPI, forecast, reports, low stock, PO approvals, users) and into the
 * warehouse/inventory sections manager oversees.
 */

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
import { formatCurrency } from '@/shared/utils'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import AlertsPanel from './components/AlertsPanel'

const stats = [
  {
    title: 'Pending PO Approvals',
    value: 5,
    change: '2 over ₱50,000',
    changeType: 'neutral',
    icon: ShoppingCart,
    color: 'purple',
  },
  {
    title: 'Monthly Revenue',
    value: formatCurrency(125430),
    change: '+8.1% vs last month',
    changeType: 'increase',
    icon: TrendingUp,
    color: 'green',
  },
  {
    title: 'Cost Savings',
    value: formatCurrency(8250),
    change: 'from reorder optimization',
    changeType: 'increase',
    icon: FileBarChart,
    color: 'blue',
  },
  {
    title: 'Low Stock Items',
    value: 23,
    change: 'across all warehouses',
    changeType: 'decrease',
    icon: AlertCircle,
    color: 'red',
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
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
}

export default function ManagerDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
