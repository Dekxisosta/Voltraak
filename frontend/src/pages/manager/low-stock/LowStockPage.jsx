/**
 * Low Stock Alerts Page - Manager
 * Monitor products at or below reorder points
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockLowStockAlerts } from '@/shared/mocks/manager/low-stock'
// TODO: import { inventoryApi } from '@/api'

export default function LowStockPage() {
  const [data, setData] = useState({ alerts: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadLowStockAlerts()
  }, [])

  const loadLowStockAlerts = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockLowStockAlerts,
        () => null // TODO: inventoryApi.getProducts({ stock_status: 'low' })
      )
      setData({ alerts: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load low stock alerts' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCreatePO = (item) => {
    addNotification({ type: 'success', title: 'PO Draft Created', message: `Purchase order for ${item.suggested_order_qty} units of ${item.product_name}` })
  }

  const getStatusBadge = (status) => {
    const map = {
      out_of_stock: { variant: 'critical', label: 'Out of Stock' },
      critical: { variant: 'critical', label: 'Critical' },
      low: { variant: 'warning', label: 'Low Stock' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current', render: (val, row) => <span className={val <= row.minimum_stock ? 'text-gray-600 dark:text-gray-400 font-bold' : 'font-medium'}>{val}</span> },
    { key: 'reorder_point', label: 'Reorder Point' },
    { key: 'days_until_stockout', label: 'Days to Stockout', render: (val) => <span className={`font-bold ${val === 0 ? 'text-gray-600 dark:text-gray-400' : val <= 7 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{val === 0 ? 'NOW' : `${val} days`}</span> },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'suggested_order_qty', label: 'Suggested Order' },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <Button size="sm" variant="primary" icon={ShoppingCart} onClick={() => handleCreatePO(row)}>Create PO</Button>
    )},
  ]

  const filteredAlerts = data.alerts.filter(a =>
    a.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading low stock alerts..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Low Stock Alerts" subtitle="Products at or below reorder point" icon={AlertTriangle} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.alerts.filter(a => a.status === 'out_of_stock').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.alerts.filter(a => a.status === 'critical').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Critical</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.alerts.filter(a => a.status === 'low').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.alerts.reduce((s, a) => s + a.suggested_order_qty, 0)}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Units to Order</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." className="w-full sm:max-w-md" />
          </div>
          <Table data={filteredAlerts} columns={columns} emptyMessage="No low stock alerts" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>
    </div>
  )
}