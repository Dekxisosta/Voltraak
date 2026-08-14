/**
 * PO Approvals Page - Manager
 * Review and approve/reject purchase orders
 */

import { useState, useEffect } from 'react'
import { ShoppingCart, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/components/common'
import { PageHeader } from '@/components/layout'
import { useNotifications } from '@/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockPurchaseOrders as mockManagerPOs } from './mocks'
// TODO: import { procurementApi } from '@/api'

export default function POApprovalsPage() {
  const [data, setData] = useState({ orders: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockManagerPOs,
        () => null // TODO: procurementApi.getPurchaseOrders()
      )
      setData({ orders: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load purchase orders' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleApprove = (po) => {
    addNotification({ type: 'success', title: 'PO Approved', message: `${po.po_number} approved - ₱${po.total_amount.toLocaleString()} to ${po.supplier}` })
    loadPurchaseOrders()
  }

  const handleReject = (po) => {
    addNotification({ type: 'warning', title: 'PO Rejected', message: `${po.po_number} has been rejected` })
    loadPurchaseOrders()
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: { variant: 'warning', label: 'Pending Approval' },
      approved: { variant: 'ok', label: 'Approved' },
      rejected: { variant: 'critical', label: 'Rejected' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const getPriorityBadge = (priority) => {
    const map = {
      high: { variant: 'critical', label: 'High' },
      medium: { variant: 'warning', label: 'Medium' },
      low: { variant: 'neutral', label: 'Low' },
    }
    const config = map[priority] || { variant: 'neutral', label: priority }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'po_number', label: 'PO Number', sortable: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'total_amount', label: 'Amount', render: (val) => `₱${val.toLocaleString()}` },
    { key: 'items_count', label: 'Items' },
    { key: 'priority', label: 'Priority', render: (val) => getPriorityBadge(val) },
    { key: 'requested_by', label: 'Requested By' },
    { key: 'requested_at', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'actions', label: 'Actions', render: (_, row) => row.status === 'pending' ? (
      <div className="flex space-x-2">
        <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => handleApprove(row)}>Approve</Button>
        <Button size="sm" variant="danger" icon={XCircle} onClick={() => handleReject(row)}>Reject</Button>
      </div>
    ) : null },
  ]

  const filteredOrders = data.orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => o.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || o.supplier.toLowerCase().includes(searchTerm.toLowerCase()))

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading purchase orders..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="PO Approvals" subtitle="Review and approve purchase orders" icon={ShoppingCart} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-yellow-600">{data.orders.filter(o => o.status === 'pending').length}</p><p className="text-sm text-gray-600">Pending Approval</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-green-600">{data.orders.filter(o => o.status === 'approved').length}</p><p className="text-sm text-gray-600">Approved</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-red-600">{data.orders.filter(o => o.status === 'pending' && o.priority === 'high').length}</p><p className="text-sm text-gray-600">High Priority</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-blue-600">₱{(data.orders.filter(o => o.status === 'pending').reduce((s, o) => s + o.total_amount, 0) / 1000).toFixed(0)}K</p><p className="text-sm text-gray-600">Pending Value</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex justify-between items-center mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by PO number or supplier..." className="max-w-md" />
            <div className="flex space-x-2">
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table data={filteredOrders} columns={columns} emptyMessage="No purchase orders match your filters" />
        </Card.Body>
      </Card>
    </div>
  )
}
