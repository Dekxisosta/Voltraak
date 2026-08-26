/**
 * Forecast Reports Page - Manager
 * Demand forecasting and reorder point calculations
 */

import { useState, useEffect } from 'react'
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, Table, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockForecasts } from '@/shared/mocks/manager/forecast'
// TODO: import { reportingApi } from '@/api'

export default function ForecastPage() {
  const [data, setData] = useState({ forecasts: [], loading: true })
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
      const result = await fetchData(
        () => mockForecasts,
        () => null // TODO: reportingApi.getForecasts()
      )
      setData({ forecasts: result, loading: false })
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