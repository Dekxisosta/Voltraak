/**
 * Dashboard statistics component
 */

import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'
import { formatCompactNumber, formatCompactCurrency, formatPercentage } from '@/shared/utils'


const mockStats = [
  {
    title: 'Total Products',
    value: formatCompactNumber(1247),
    change: '+12 this week',
    changeType: 'increase',
    icon: Package,
    color: 'neutral',
  },
  {
    title: 'Low Stock Items',
    value: formatCompactNumber(23),
    change: '-5 from yesterday',
    changeType: 'decrease',
    icon: AlertTriangle,
    color: 'warning',
  },
  {
    title: 'Inventory Value',
    value: formatCompactCurrency(892450),
    change: '+2.4% this month',
    changeType: 'increase',
    icon: TrendingDown,
    color: 'neutral',
  },
  {
    title: 'System Accuracy',
    value: formatPercentage(96.8),
    change: '+1.2% improvement',
    changeType: 'increase',
    icon: CheckCircle,
    color: 'neutral',
  },
]

// Only stats that represent an actual status worth flagging (e.g. low
// stock) get a color. Plain counts and totals stay neutral so they don't
// compete for attention.
const colorClasses = {
  neutral: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800/60',
  },
}

export default function DashboardStats() {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {mockStats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
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
              <p className={`text-xs mt-1 truncate ${
                stat.changeType === 'increase' 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : stat.changeType === 'decrease' 
                  ? 'text-gray-600 dark:text-gray-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {stat.change}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}