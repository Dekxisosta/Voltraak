/**
 * Expiry Alerts Page - Inventory Staff
 * Monitor batch expiry dates and manage FEFO compliance
 */

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockExpiryBatches } from '@/shared/mocks/inventory/expiry-alerts'
// TODO: import { inventoryApi } from '@/api'

export default function ExpiryAlertsPage() {
  const [data, setData] = useState({ batches: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadExpiryData()
  }, [])

  const loadExpiryData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockExpiryBatches,
        () => null // TODO: inventoryApi.getExpiryAlerts()
      )
      setData({ batches: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load expiry data' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const getExpiryBadge = (status, days) => {
    if (status === 'expired') return <StatusBadge variant="critical" label={`Expired (${Math.abs(days)}d ago)`} />
    if (days <= 30) return <StatusBadge variant="critical" label={`${days} days`} />
    if (days <= 60) return <StatusBadge variant="warning" label={`${days} days`} />
    return <StatusBadge variant="ok" label={`${days} days`} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'batch_number', label: 'Batch #' },
    { key: 'quantity', label: 'Qty Available' },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true },
    { key: 'days_to_expiry', label: 'Days Remaining', render: (val, row) => getExpiryBadge(row.status, val) },
    { key: 'actions', label: 'Actions', render: (_, row) => row.status === 'expired' ? (
      <Button size="sm" variant="danger">Write Off</Button>
    ) : row.status === 'warning' ? (
      <Button size="sm" variant="warning">Prioritize</Button>
    ) : null },
  ]

  const filteredBatches = data.batches
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => b.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()))

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading expiry data..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expiry Alerts" subtitle="Monitor batch expiration and FEFO compliance" icon={Calendar} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-red-600">{data.batches.filter(b => b.status === 'expired').length}</p><p className="text-sm text-gray-600">Expired Batches</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-yellow-600">{data.batches.filter(b => b.status === 'warning').length}</p><p className="text-sm text-gray-600">Expiring Soon (≤60d)</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-green-600">{data.batches.filter(b => b.status === 'safe').length}</p><p className="text-sm text-gray-600">Safe Batches</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-900">{data.batches.reduce((s, b) => s + b.quantity, 0)}</p><p className="text-sm text-gray-600">Total Units Tracked</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex justify-between items-center mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products or batches..." className="max-w-md" />
            <div className="flex space-x-2">
              {['all', 'expired', 'warning', 'safe'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table data={filteredBatches} columns={columns} emptyMessage="No batches match your filters" />
        </Card.Body>
      </Card>
    </div>
  )
}
