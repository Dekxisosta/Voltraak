/**
 * KPI Dashboard Page - Manager
 * Executive-level inventory metrics and analytics
 */

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Package, AlertTriangle, DollarSign, Users } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Card, LoadingSpinner, StatusBadge } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockKPIData } from '@/shared/mocks/manager/kpi'
// TODO: import { reportingApi } from '@/api'

// Tooltips are themed manually (rather than relying on recharts' default
// white tooltip) so they read correctly in dark mode too, using the same
// CSS variable tokens as the rest of the app.
function StockValueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-surface-popover)] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        ₱{(payload[0].value / 1000000).toFixed(2)}M
      </p>
    </div>
  )
}

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-surface-popover)] px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.payload.color }} />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{entry.name}</p>
      </div>
      <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{entry.value}%</p>
    </div>
  )
}




export default function KPIDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadKPIData()
  }, [timeframe])

  const loadKPIData = async () => {
    try {
      setLoading(true)
      
      const result = await fetchData(
        () => mockKPIData,
        () => null // TODO: reportingApi.getKPIDashboard()
      )
      setData(result)
      setLoading(false)
    } catch (error) {
      console.error('Error loading KPI data:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load KPI dashboard data'
      })
      setLoading(false)
    }
  }

  const _getMetricTrend = (current, target) => {
    const diff = current - target
    const percentage = (diff / target) * 100
    
    if (Math.abs(percentage) < 1) {
      return { trend: 'stable', color: 'text-gray-600 dark:text-gray-400', icon: '→' }
    } else if (percentage > 0) {
      return { trend: 'up', color: 'text-gray-600 dark:text-gray-400', icon: '↗' }
    } else {
      return { trend: 'down', color: 'text-gray-600 dark:text-gray-400', icon: '↘' }
    }
  }

  const getMetricStatus = (value, target, reverse = false) => {
    const percentage = (value / target) * 100
    
    if (reverse) {
      // For metrics where lower is better (like shrinkage)
      if (percentage <= 100) return 'ok'
      if (percentage <= 120) return 'warning'
      return 'critical'
    } else {
      // For metrics where higher is better
      if (percentage >= 95) return 'ok'
      if (percentage >= 85) return 'warning'
      return 'critical'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading KPI dashboard..." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400">Unable to retrieve KPI data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI Dashboard"
        subtitle="Executive inventory performance metrics"
        icon={BarChart3}
        action={
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="form-input"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        }
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total SKUs */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.totalSKUs}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total SKUs</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">+5 this month</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Stock Value */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ₱{(data.metrics.stockValue / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock Value</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-gray-600 dark:text-gray-400 mr-1" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">+3.5% from last month</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.lowStockItems}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
                <StatusBadge 
                  variant={data.metrics.lowStockItems > 15 ? 'critical' : data.metrics.lowStockItems > 8 ? 'warning' : 'ok'} 
                  label={data.metrics.lowStockItems > 15 ? 'High' : data.metrics.lowStockItems > 8 ? 'Medium' : 'Low'}
                  size="sm"
                />
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Shrinkage Rate */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.shrinkageRate}%</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Shrinkage Rate</p>
                <StatusBadge 
                  variant={getMetricStatus(data.metrics.shrinkageRate, 5, true)} 
                  label={data.metrics.shrinkageRate <= 3 ? 'Excellent' : data.metrics.shrinkageRate <= 5 ? 'Good' : 'Needs Attention'}
                  size="sm"
                />
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Inventory Accuracy */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inventory Accuracy</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.inventoryAccuracy}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.inventoryAccuracy, 95)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-800 dark:bg-gray-300 h-2 rounded-full"
                style={{ width: `${data.metrics.inventoryAccuracy}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Target: 95%+</p>
          </Card.Body>
        </Card>

        {/* Turnover Rate */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Turnover Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.turnoverRate}x</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.turnoverRate, 3)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-800 dark:bg-gray-300 h-2 rounded-full"
                style={{ width: `${Math.min((data.metrics.turnoverRate / 6) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Target: 3x+</p>
          </Card.Body>
        </Card>

        {/* Service Level */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Service Level</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.serviceLevel}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.serviceLevel, 90)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-800 dark:bg-gray-300 h-2 rounded-full"
                style={{ width: `${data.metrics.serviceLevel}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Target: 90%+</p>
          </Card.Body>
        </Card>

        {/* FEFO Compliances*/}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">FEFO Compliance</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.metrics.fefoCompliance}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.fefoCompliance, 85)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-800 dark:bg-gray-300 h-2 rounded-full"
                style={{ width: `${data.metrics.fefoCompliance}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Target: 85%+</p>
          </Card.Body>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Value Trend */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Stock Value Trend</h3>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.trends.stockValue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => value.split(' ')[0]}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border-primary)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<StockValueTooltip />} cursor={{ stroke: 'var(--color-border-secondary)', strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fill="url(#stockValueGradient)"
                  activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-surface-card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Category Breakdowns */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Category Distribution</h3>
          </Card.Header>
          <Card.Body>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220} className="sm:flex-1">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="var(--color-surface-card)"
                  >
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="w-full sm:w-40 space-y-2.5 flex-shrink-0">
                {data.categoryBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                      <span className="text-sm text-[var(--color-text-secondary)] truncate">{category.category}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)] flex-shrink-0">{category.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Alerts Section */}
      {data.alerts.length > 0 && (
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-medium">Active Alerts</h3>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'critical' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-medium ${
                        alert.type === 'critical' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'
                      }`}>
                        {alert.title}
                      </h4>
                      <p className={`text-sm ${
                        alert.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {alert.message}
                      </p>
                    </div>
                    <StatusBadge 
                      variant={alert.type === 'critical' ? 'critical' : 'warning'} 
                      label={alert.type === 'critical' ? 'Critical' : 'Warning'}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}