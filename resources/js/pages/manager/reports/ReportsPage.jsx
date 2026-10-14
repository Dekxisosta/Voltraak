/**
 * Inventory Reports Page - Manager
 * Comprehensive inventory analytics and reporting
 */

import { useState, useEffect } from 'react'
import { BarChart3, Download, DollarSign, Package, TrendingUp } from 'lucide-react'
import { Card, LoadingSpinner, Button } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockReportData } from '@/shared/mocks/manager/reports'
import { reportingApi } from '@/shared/api/reporting'

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState('30d')
  const [exporting, setExporting] = useState(null) // 'pdf' | 'csv' | null
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadReportData()
  }, [reportPeriod])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const response = await fetchData(
        () => mockReportData,
        () => reportingApi.getInventoryReport({ period: reportPeriod })
      )
      // Backend wraps in Laravel envelope { success, data: {...}, message, timestamp }
      setData(response?.data || response)
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: error?.message || 'Failed to load report data' })
    } finally {
      setLoading(false)
    }
  }

  const buildCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Inventory Report', `Last ${reportPeriod}`],
      [],
      ['Summary'],
      ['Total Inventory Value', data?.summary?.total_inventory_value ?? 0],
      ['Total SKUs', data?.summary?.total_skus ?? 0],
      ['Total Units', data?.summary?.total_units ?? 0],
      ['Avg Turnover Rate', data?.summary?.avg_turnover_rate ?? 0],
      [],
      ['Category', 'Value', 'Units', 'Percentage'],
      ...(data?.category_breakdown || []).map(c => [c.category, c.value, c.units, c.percentage]),
      [],
      ['Stock Movement'],
      ['Stock In', data?.movement_summary?.total_stock_in ?? 0],
      ['Stock Out', data?.movement_summary?.total_stock_out ?? 0],
      ['Adjustments', data?.movement_summary?.total_adjustments ?? 0],
      ['Net Change', data?.movement_summary?.net_change ?? 0],
      [],
      ['Top Mover', 'Units Sold', 'Revenue'],
      ...(data?.top_movers || []).map(m => [m.name, m.units_sold, m.revenue]),
    ]
    return rows.map(r => r.map(esc).join(',')).join('\n')
  }

  const handleExport = async (format) => {
    setExporting(format)
    try {
      if (format === 'csv') {
        const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `inventory-report-${reportPeriod}-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      } else {
        // PDF: the browser's print dialog ("Save as PDF") on the rendered report.
        window.print()
      }
      addNotification({ type: 'success', title: 'Export Ready', message: `Report exported as ${format.toUpperCase()}` })
    } catch (error) {
      addNotification({ type: 'error', title: 'Export Failed', message: error?.message || `Could not export ${format.toUpperCase()}` })
    } finally {
      setExporting(null)
    }
  }

  const signed = (n) => `${n > 0 ? '+' : ''}${(n || 0).toLocaleString()}`

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Generating reports..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Reports" subtitle="Comprehensive analytics and insights" icon={BarChart3} />

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {[{ val: '7d', label: '7 Days' }, { val: '30d', label: '30 Days' }, { val: '90d', label: '90 Days' }].map(p => (
            <button key={p.val} onClick={() => setReportPeriod(p.val)} className={`px-4 py-2 text-sm rounded-lg ${reportPeriod === p.val ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm" icon={Download} loading={exporting === 'pdf'} disabled={exporting !== null} onClick={() => handleExport('pdf')}>PDF</Button>
          <Button variant="secondary" size="sm" icon={Download} loading={exporting === 'csv'} disabled={exporting !== null} onClick={() => handleExport('csv')}>CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-xl font-bold">₱{(Number(data?.summary?.total_inventory_value || 0) / 1000000).toFixed(2)}M</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Package className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-xl font-bold">{data?.summary?.total_skus || 0}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total SKUs</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><BarChart3 className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-xl font-bold">{(data?.summary?.total_units || 0).toLocaleString()}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Units</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><TrendingUp className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-xl font-bold">{data?.summary?.avg_turnover_rate || 0}x</p><p className="text-sm text-gray-600 dark:text-gray-400">Avg Turnover Rate</p></div></div></Card.Body></Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <Card.Header><h3 className="text-lg font-semibold">Category Breakdown</h3></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {(data?.category_breakdown || []).map(cat => (
              <div key={cat.category} className="flex items-center">
                <div className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300">{cat.category}</div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div className="bg-gray-800 dark:bg-gray-300 h-4 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
                <div className="w-32 text-right text-sm"><span className="font-medium">₱{(cat.value / 1000).toFixed(0)}K</span> <span className="text-gray-500 dark:text-gray-400">({cat.units} units)</span></div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Movement Summary + Top Mover */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Stock Movement Summary</h3></Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">Stock In</span><span className="font-bold text-gray-600 dark:text-gray-400">+{(data?.movement_summary?.total_stock_in || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">Stock Out</span><span className="font-bold text-gray-600 dark:text-gray-400">-{(data?.movement_summary?.total_stock_out || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">Adjustments</span><span className="font-bold text-gray-600 dark:text-gray-400">{(data?.movement_summary?.total_adjustments || 0).toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-2"><span className="text-gray-700 dark:text-gray-300 font-medium">Net Change</span><span className="font-bold text-gray-600 dark:text-gray-400">{signed(data?.movement_summary?.net_change)}</span></div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Top Movers</h3></Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {(data?.top_movers || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div><span className="text-sm font-medium">{item.name}</span><br /><span className="text-xs text-gray-500 dark:text-gray-400">{Number(item.units_sold || 0).toLocaleString()} units sold</span></div>
                  <span className="font-bold text-gray-600 dark:text-gray-400">₱{(item.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}