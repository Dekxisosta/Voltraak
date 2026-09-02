/**
 * PO Approvals Page - Manager
 * Review and approve/reject purchase orders
 */

import { useState, useEffect } from 'react'
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner, ConfirmModal } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: procurementApi } once the endpoint exists
const poApprovalsSource = createResourceDataSource('manager/po-approvals')

export default function POApprovalsPage() {
  const [data, setData] = useState({ orders: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await poApprovalsSource.list()
      setData({ orders: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load purchase orders' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleApprove = async (po) => {
    try {
      await poApprovalsSource.update(po.id, { status: 'approved' })
      addNotification({ type: 'success', title: 'PO Approved', message: `${po.po_number} approved - ₱${po.total_amount.toLocaleString()} to ${po.supplier}` })
      loadPurchaseOrders()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to approve ${po.po_number}` })
    }
  }

  const handleReject = async (po) => {
    try {
      await poApprovalsSource.update(po.id, { status: 'rejected' })
      addNotification({ type: 'warning', title: 'PO Rejected', message: `${po.po_number} has been rejected` })
      loadPurchaseOrders()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to reject ${po.po_number}` })
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    setRejecting(true)
    try {
      await handleReject(rejectTarget)
      setRejectTarget(null)
    } finally {
      setRejecting(false)
    }
  }

  // Drives the Kanban view's drag-and-drop: dropping a card into a
  // different lane re-runs the same approve/reject/reopen logic the
  // list view's buttons use, so status stays consistent either way.
  const handleKanbanMove = (po, newStatus) => {
    if (newStatus === 'approved') return handleApprove(po)
    if (newStatus === 'rejected') return handleReject(po)
    poApprovalsSource.update(po.id, { status: newStatus }).then(loadPurchaseOrders)
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
        <Button size="sm" variant="danger" icon={XCircle} onClick={() => setRejectTarget(row)}>Reject</Button>
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
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.orders.filter(o => o.status === 'pending').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.orders.filter(o => o.status === 'approved').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Approved</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.orders.filter(o => o.status === 'pending' && o.priority === 'high').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">₱{(data.orders.filter(o => o.status === 'pending').reduce((s, o) => s + o.total_amount, 0) / 1000).toFixed(0)}K</p><p className="text-sm text-gray-600 dark:text-gray-400">Pending Value</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by PO number or supplier..." className="w-full sm:max-w-md" />
            <div className="flex flex-wrap gap-2">
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === s ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table
            data={filteredOrders}
            columns={columns}
            emptyMessage="No purchase orders match your filters"
            highlightRowId={highlightRowId}
            views={['list', 'card', 'kanban']}
            viewStorageKey="po-approvals"
            getRowId={(row) => row.id}
            kanbanBy="status"
            kanbanLanes={[
              { value: 'pending', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            onKanbanMove={handleKanbanMove}
          />
        </Card.Body>
      </Card>

      <ConfirmModal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title="Reject Purchase Order"
        message={rejectTarget ? `Are you sure you want to reject ${rejectTarget.po_number} from ${rejectTarget.supplier}?` : ''}
        confirmText="Reject"
        variant="danger"
        loading={rejecting}
      />
    </div>
  )
}