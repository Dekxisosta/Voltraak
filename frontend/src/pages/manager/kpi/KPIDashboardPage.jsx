/**
 * KPI Dashboard Page - Manager
 * Executive-level inventory metrics and analytics
 */

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Package, AlertTriangle, DollarSign, Users } from 'lucide-react'
import { Card, LoadingSpinner, StatusBadge } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockKPIData } from '@/shared/mocks/manager/kpi'
// TODO: import { reportingApi } from '@/api'




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
      return { trend: 'stable', color: 'text-gray-600', icon: '→' }
    } else if (percentage > 0) {
      return { trend: 'up', color: 'text-green-600', icon: '↗' }
    } else {
      return { trend: 'down', color: 'text-red-600', icon: '↘' }
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
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600">Unable to retrieve KPI data. Please try again.</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900">{data.metrics.totalSKUs}</p>
                <p className="text-sm font-medium text-gray-600">Total SKUs</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-600">+5 this month</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Stock Value */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(data.metrics.stockValue / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">+3.5% from last month</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900">{data.metrics.lowStockItems}</p>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
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
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-2xl font-bold text-gray-900">{data.metrics.shrinkageRate}%</p>
                <p className="text-sm font-medium text-gray-600">Shrinkage Rate</p>
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
                <p className="text-sm font-medium text-gray-600">Inventory Accuracy</p>
                <p className="text-3xl font-bold text-gray-900">{data.metrics.inventoryAccuracy}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.inventoryAccuracy, 95)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${data.metrics.inventoryAccuracy}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: 95%+</p>
          </Card.Body>
        </Card>

        {/* Turnover Rate */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
                <p className="text-3xl font-bold text-gray-900">{data.metrics.turnoverRate}x</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.turnoverRate, 3)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min((data.metrics.turnoverRate / 6) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: 3x+</p>
          </Card.Body>
        </Card>

        {/* Service Level */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Level</p>
                <p className="text-3xl font-bold text-gray-900">{data.metrics.serviceLevel}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.serviceLevel, 90)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${data.metrics.serviceLevel}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: 90%+</p>
          </Card.Body>
        </Card>

        {/* FEFO Compliance */}
        <Card>
          <Card.Body>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">FEFO Compliance</p>
                <p className="text-3xl font-bold text-gray-900">{data.metrics.fefoCompliance}%</p>
              </div>
              <StatusBadge variant={getMetricStatus(data.metrics.fefoCompliance, 85)} label="" size="sm" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${data.metrics.fefoCompliance}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: 85%+</p>
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
            <div className="h-64 flex items-end justify-between space-x-2">
              {data.trends.stockValue.map((item, index) => {
                const maxValue = Math.max(...data.trends.stockValue.map(d => d.value))
                const height = (item.value / maxValue) * 100
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="text-xs font-medium mb-2">
                      ₱{(item.value / 1000000).toFixed(1)}M
                    </div>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                    />
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {item.period.split(' ')[0]}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card.Body>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Category Distribution</h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {data.categoryBreakdown.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium">{category.category}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${category.value}%`,
                          backgroundColor: category.color 
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-10">{category.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Alerts Section */}
      {data.alerts.length > 0 && (
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
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
                      ? 'bg-red-50 border-red-500' 
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-medium ${
                        alert.type === 'critical' ? 'text-red-900' : 'text-yellow-900'
                      }`}>
                        {alert.title}
                      </h4>
                      <p className={`text-sm ${
                        alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
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