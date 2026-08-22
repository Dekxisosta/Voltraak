/**
 * Reservations Page - Inventory Staff
 * Manage stock reservations for customer orders
 */

import { useState, useEffect } from 'react'
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockReservations } from '@/shared/mocks/inventory/reservations'
// TODO: import { inventoryApi } from '@/api'

export default function ReservationsPage() {
  const [data, setData] = useState({ reservations: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockReservations,
        () => null // TODO: inventoryApi.getReservations()
      )
      setData({ reservations: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load reservations' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleFulfill = (id) => {
    addNotification({ type: 'success', title: 'Fulfilled', message: `Reservation #${id} marked as fulfilled` })
    loadReservations()
  }

  const handleCancel = (id) => {
    addNotification({ type: 'warning', title: 'Cancelled', message: `Reservation #${id} cancelled, stock released` })
    loadReservations()
  }

  const getStatusBadge = (status) => {
    const map = {
      active: { variant: 'ok', label: 'Active' },
      fulfilled: { variant: 'ok', label: 'Fulfilled' },
      expired: { variant: 'critical', label: 'Expired' },
      cancelled: { variant: 'neutral', label: 'Cancelled' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'order_number', label: 'Order #', sortable: true },
    { key: 'customer_name', label: 'Customer' },
    { key: 'product_name', label: 'Product' },
    { key: 'quantity', label: 'Qty' },
    { key: 'reserved_at', label: 'Reserved', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'expires_at', label: 'Expires', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'actions', label: 'Actions', render: (_, row) => row.status === 'active' ? (
      <div className="flex space-x-2">
        <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => handleFulfill(row.id)}>Fulfill</Button>
        <Button size="sm" variant="danger" icon={XCircle} onClick={() => handleCancel(row.id)}>Cancel</Button>
      </div>
    ) : null },
  ]

  const filteredReservations = data.reservations.filter(r =>
    r.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading reservations..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" subtitle="Manage stock reservations for customer orders" icon={Package} />

      <Card>
        <Card.Body>
          <div className="mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by order, customer, or product..." className="w-full sm:max-w-md" />
          </div>
          <Table data={filteredReservations} columns={columns} emptyMessage="No reservations found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-2xl font-bold">{data.reservations.filter(r => r.status === 'active').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Active Reservations</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Package className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-2xl font-bold">{data.reservations.filter(r => r.status === 'active').reduce((s, r) => s + r.quantity, 0)}</p><p className="text-sm text-gray-600 dark:text-gray-400">Units Reserved</p></div></div></Card.Body></Card>
        <Card><Card.Body><div className="flex items-center"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div><div className="ml-4"><p className="text-2xl font-bold">{data.reservations.filter(r => r.status === 'expired').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Expired</p></div></div></Card.Body></Card>
      </div>
    </div>
  )
}
