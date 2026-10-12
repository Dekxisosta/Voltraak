/**
 * Dashboard statistics component
 */

import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/shared/utils'


const mockStats = [
  {
    title: 'Total Products',
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
    icon: AlertTriangle,
    color: 'yellow',
  },
  {
    title: 'Inventory Value',
    value: formatCurrency(892450),
    change: '+2.4% this month',
    changeType: 'increase',
    icon: TrendingDown,
    color: 'green',
  },
  {
    title: 'System Accuracy',
    value: formatPercentage(96.8),
    change: '+1.2% improvement',
    changeType: 'increase',
    icon: CheckCircle,
    color: 'green',
  },
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
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
                  ? 'text-green-600 dark:text-green-400' 
                  : stat.changeType === 'decrease' 
                  ? 'text-red-600 dark:text-red-400' 
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