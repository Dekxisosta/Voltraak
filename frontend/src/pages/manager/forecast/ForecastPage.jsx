/**
 * Forecast Reports Page - Manager
 * Demand forecasting and reorder point calculations
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, ArrowUp, ArrowDown, ArrowRight, AlertTriangle, ShoppingCart } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, Table, SearchBar, LoadingSpinner, StatusBadge } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockForecasts, mockDemandTrend } from '@/shared/mocks/manager/forecast'
// TODO: import { reportingApi } from '@/api'

const CATEGORY_COLORS = {
  'Refrigerators': '#3b82f6',
  'Washing Machines': '#22c55e',
  'Air Conditioners': '#f59e0b',
  'Kitchen Appliances': '#a855f7',
  'Others': '#94a3b8',
}

// Themed manually (rather than recharts' default white tooltip) so it
// reads correctly in dark mode too, using the same CSS variable tokens
// as the rest of the app.
function DemandTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const entry = payload.find(p => p.value != null)
  if (!entry) return null
  return (
    <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-surface-popover)] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {entry.value} units {entry.dataKey === 'forecast' ? '(forecast)' : ''}
      </p>
    </div>
  )
}

export default function ForecastPage() {
  const [data, setData] = useState({ forecasts: [], trend: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [timeframe, setTimeframe] = useState('8w')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadForecasts()
  }, [timeframe])

  const loadForecasts = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const [forecasts, trend] = await Promise.all([
        fetchData(
          () => mockForecasts,
          () => null // TODO: reportingApi.getForecasts()
        ),
        fetchData(
          () => mockDemandTrend,
          () => null // TODO: reportingApi.getDemandTrend()
        ),
      ])
      setData({ forecasts, trend, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load forecast data' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <span className="flex items-center text-gray-600 dark:text-gray-400"><ArrowUp className="h-4 w-4" /> Rising</span>
    if (trend === 'down') return <span className="flex items-center text-gray-600 dark:text-gray-400"><ArrowDown className="h-4 w-4" /> Falling</span>
    return <span className="text-gray-500 dark:text-gray-400">Stable</span>
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'current_stock', label: 'Current Stock' },
    { key: 'avg_weekly_demand', label: 'Avg Weekly Demand' },
    { key: 'forecast_demand_8w', label: '8-Week Forecast' },
    { key: 'reorder_point', label: 'Reorder Point' },
    { key: 'suggested_order', label: 'Suggested Order', render: (val) => val > 0 ? <span className="font-bold text-gray-600 dark:text-gray-400">{val} units</span> : <span className="text-gray-400 dark:text-gray-500">None needed</span> },
    { key: 'trend', label: 'Trend', render: (val) => getTrendIcon(val) },
    { key: 'confidence', label: 'Confidence', render: (val) => <span className={`font-medium ${val >= 90 ? 'text-gray-600 dark:text-gray-400' : val >= 80 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{val}%</span> },
  ]

  const filteredForecasts = data.forecasts.filter(f =>
    f.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Forecast demand aggregated by category, for the breakdown widget.
  const categoryDemand = Object.values(
    data.forecasts.reduce((acc, f) => {
      const key = f.category || 'Others'
      if (!acc[key]) acc[key] = { category: key, demand: 0, color: CATEGORY_COLORS[key] || CATEGORY_COLORS.Others }
      acc[key].demand += f.forecast_demand_8w
      return acc
    }, {})
  ).sort((a, b) => b.demand - a.demand)
  const maxCategoryDemand = Math.max(...categoryDemand.map(c => c.demand), 1)

  // Items that need reordering, ranked by suggested order size, with an
  // estimated cost and a weeks-of-stock-left urgency read.
  const reorderQueue = data.forecasts
    .filter(f => f.suggested_order > 0)
    .map(f => ({
      ...f,
      estimatedCost: f.suggested_order * (f.unit_cost || 0),
      weeksOfStock: f.avg_weekly_demand > 0 ? f.current_stock / f.avg_weekly_demand : Infinity,
    }))
    .sort((a, b) => b.suggested_order - a.suggested_order)
  const totalReorderCost = reorderQueue.reduce((sum, f) => sum + f.estimatedCost, 0)
  const totalReorderUnits = reorderQueue.reduce((sum, f) => sum + f.suggested_order, 0)

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Generating forecasts..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Demand Forecasts" subtitle="AI-powered demand prediction and reorder suggestions" icon={TrendingUp} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.forecasts.filter(f => f.suggested_order > 0).length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Items Need Reorder</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.forecasts.filter(f => f.trend === 'up').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Trending Up</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{Math.round(data.forecasts.reduce((s, f) => s + f.confidence, 0) / data.forecasts.length)}%</p><p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.forecasts.reduce((s, f) => s + f.forecast_demand_8w, 0)}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total 8-Week Demand</p></div></Card.Body></Card>
      </div>

      {/* Demand Trend + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Demand Trend</h3>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualDemandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastDemandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border-primary)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<DemandTrendTooltip />} cursor={{ stroke: 'var(--color-border-secondary)', strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fill="url(#actualDemandGradient)"
                  connectNulls={false}
                  activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-surface-card)', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  fill="url(#forecastDemandGradient)"
                  connectNulls={false}
                  activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-surface-card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Solid line: last 8 weeks actual demand. Dashed line: next 8 weeks forecasted demand, combined across all SKUs.
            </p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Demand by Category</h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {categoryDemand.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cat.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0 ml-2">{cat.demand} units</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(cat.demand / maxCategoryDemand) * 100}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">8-week forecasted demand, grouped by product category.</p>
          </Card.Body>
        </Card>
      </div>

      {/* Reorder Priority */}
      <Card>
        <Card.Header>
          <div className="flex items-center">
            <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h3 className="text-lg font-medium">Reorder Priority</h3>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {reorderQueue.length} SKUs need restocking, {totalReorderUnits} units total
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ₱{(totalReorderCost / 1000).toFixed(0)}K estimated investment
            </p>
          </div>
          <div className="space-y-2">
            {reorderQueue.slice(0, 4).map((item) => {
              const isCritical = item.weeksOfStock < 2
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.current_stock === 0
                        ? 'Out of stock now'
                        : `${item.weeksOfStock.toFixed(1)} weeks of stock left`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.suggested_order} units</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">₱{(item.estimatedCost / 1000).toFixed(0)}K</span>
                    <StatusBadge variant={isCritical ? 'critical' : 'warning'} label={isCritical ? 'Urgent' : 'Plan ahead'} size="sm" />
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            to="/manager?tab=po-approvals"
            className="mt-4 inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Send to purchase approvals <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." className="w-full sm:max-w-md" />
            <div className="flex flex-wrap gap-2">
              {[{ val: '4w', label: '4 Weeks' }, { val: '8w', label: '8 Weeks' }, { val: '12w', label: '12 Weeks' }].map(t => (
                <button key={t.val} onClick={() => setTimeframe(t.val)} className={`px-3 py-1 text-sm rounded-full ${timeframe === t.val ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Table data={filteredForecasts} columns={columns} emptyMessage="No forecast data available" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>
    </div>
  )
}