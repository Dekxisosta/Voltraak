/**
 * Dashboard statistics component
 */

import { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/shared/utils'
import { apiClient } from '@/shared/api/client'

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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.get('/api/v1/inventory/dashboard/stats')
        
        console.log('Dashboard API response:', response)
        
        // The BaseController wraps data in { success, message, data, timestamp }
        const apiData = response.data
        
        console.log('Dashboard stats data:', apiData)
        
        const mappedStats = [
          {
            title: 'Total Products',
            value: formatNumber(apiData.total_products),
            icon: Package,
            color: 'blue',
          },
          {
            title: 'Low Stock Items',
            value: apiData.low_stock_count,
            icon: AlertTriangle,
            color: 'yellow',
          },
          {
            title: 'Inventory Value',
            value: formatCurrency(apiData.total_inventory_value),
            icon: TrendingDown,
            color: 'green',
          },
          {
            title: 'System Accuracy',
            value: apiData.system_accuracy !== null ? formatPercentage(apiData.system_accuracy) : 'N/A',
            icon: CheckCircle,
            color: 'green',
          },
        ]
        
        setStats(mappedStats)
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
        setError(`Failed to load dashboard statistics: ${err.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="card animate-pulse">
            <div className="card-body">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="card-body">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Dashboard Error</p>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-2">Check browser console (F12) for details</p>
        </div>
      </div>
    )
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="card-body">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">No Data</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">Dashboard stats loaded but no data was returned</p>
          <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-2">Check browser console (F12) for API response</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {stats?.map((stat, index) => (
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
          </div>
        </div>
      </div>
    </div>
  )
}