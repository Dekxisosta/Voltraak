/**
 * Inventory Reports Page - Manager
 * Comprehensive inventory analytics and reporting
 */

import { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, DollarSign, Package, TrendingUp } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/common'
import { PageHeader } from '@/components/layout'
import { useNotifications } from '@/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockReportData } from './mocks'
// TODO: import { reportingApi } from '@/api'

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState('30d')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadReportData()
  }, [reportPeriod])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const result = await fetchData(
        () => mockReportData,
        () => null // TODO: reportingApi.getInventoryReport()
      )
      setData(result)
      setLoading(false)
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load report data' })
      setLoading(false)
    }
  }

  const handleExport = (format) => {
    addNotification({ type: 'success', title: 'Export Started', message: `Report is being exported as ${format.toUpperCase()}` })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Generating reports..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Reports" subtitle="Comprehensive analytics and insights" icon={BarChart3} />

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {[{ val: '7d', label: '7 Days' }, { val: '30d', label: '30 Days' }, { val: '90d', label: '90 Days' }].map(p => (
            <button key={p.val} onClick={() => setReportPeriod(p.val)} className={`px-4 py-2 text-sm rounded-lg ${reportPeriod === p.val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <button onClick={() => handleExport('pdf')} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" /> PDF</button>
          <button onClick={() => handleExport('csv')} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" /> CSV</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div><div className="ml-4"><p className="text-xl font-bold">₱{(data.summary.total_inventory_value / 1000000).toFixed(2)}M</p><p className="text-sm text-gray-600">Total Inventory Value</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-blue-100 rounded-lg"><Package className="h-6 w-6 text-blue-600" /></div><div className="ml-4"><p className="text-xl font-bold">{data.summary.total_skus}</p><p className="text-sm text-gray-600">Total SKUs</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-purple-100 rounded-lg"><BarChart3 className="h-6 w-6 text-purple-600" /></div><div className="ml-4"><p className="text-xl font-bold">{data.summary.total_units.toLocaleString()}</p><p className="text-sm text-gray-600">Total Units</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-yellow-100 rounded-lg"><TrendingUp className="h-6 w-6 text-yellow-600" /></div><div className="ml-4"><p className="text-xl font-bold">{data.summary.avg_turnover_rate}x</p><p className="text-sm text-gray-600">Avg Turnover Rate</p></div></div></Card.Body></Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <Card.Header><h3 className="text-lg font-semibold">Category Breakdown</h3></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {data.category_breakdown.map(cat => (
              <div key={cat.category} className="flex items-center">
                <div className="w-40 text-sm font-medium text-gray-700">{cat.category}</div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
                <div className="w-32 text-right text-sm"><span className="font-medium">₱{(cat.value / 1000).toFixed(0)}K</span> <span className="text-gray-500">({cat.units} units)</span></div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Movement Summary + Top Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Stock Movement Summary</h3></Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Stock In</span><span className="font-bold text-green-600">+{data.movement_summary.total_stock_in}</span></div>
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Stock Out</span><span className="font-bold text-red-600">-{data.movement_summary.total_stock_out}</span></div>
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Adjustments</span><span className="font-bold text-yellow-600">{data.movement_summary.total_adjustments}</span></div>
              <div className="flex justify-between items-center py-2"><span className="text-gray-700 font-medium">Net Change</span><span className="font-bold text-blue-600">+{data.movement_summary.net_change}</span></div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Top Movers</h3></Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {data.top_movers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div><span className="text-sm font-medium">{item.name}</span><br /><span className="text-xs text-gray-500">{item.units_sold} units sold</span></div>
                  <span className="font-bold text-green-600">₱{(item.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
