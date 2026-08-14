/**
 * Dashboard statistics component
 */

import React from 'react'
import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/utils'

interface StatCard {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const mockStats: StatCard[] = [
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
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-200',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-200',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'border-yellow-200',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'border-red-200',
  },
}

export default function DashboardStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {mockStats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  )
}

interface StatCardProps {
  stat: StatCard
}

function StatCard({ stat }: StatCardProps) {
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
              <p className={`text-xs mt-1 ${
                stat.changeType === 'increase' 
                  ? 'text-green-600' 
                  : stat.changeType === 'decrease' 
                  ? 'text-red-600' 
                  : 'text-gray-500'
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