/**
 * Adjustment Approvals Page - Manager
 *
 * Reviews discrepancy reports that Inventory has flagged as needing a
 * significant stock adjustment or write-off (requires_approval: true,
 * approval_status: 'pending') and approves or rejects them. Reads/writes
 * the same 'inventory/discrepancies' resource Inventory's DiscrepanciesPage
 * owns — Manager only ever touches the approval_status/approved_by/
 * approved_at/write_off_amount fields here, never status/investigation.
 */

import { useState, useEffect } from 'react'
import { ClipboardCheck, CheckCircle, XCircle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner, ConfirmModal } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
import { inventoryApi } from '@/shared/api/inventory'
// API adapter for the adjustment-approval queue.
// In API mode the queue is the backend's physical counts whose variance needs
// a manager decision (GET physical-counts?requires_approval). Approve/reject
// map onto POST physical-counts/{id}/approve-variance and /reject-variance;
// the approver is taken from the authenticated session server-side.
const discrepanciesSource = createResourceDataSource('inventory/discrepancies', {
  api: {
    list: () => inventoryApi.getPhysicalCounts({ requires_approval: true, per_page: 100 }),
    update: (id, patch) => {
      if (patch.approval_status === 'approved') {
        return inventoryApi.approveVarianceAdjustment(id, {})
      }
      if (patch.approval_status === 'rejected') {
        return inventoryApi.rejectVarianceAdjustment(id, {
          rejection_reason: patch.rejection_reason || 'Rejected by manager',
        })
      }
      return Promise.reject(new Error('Unsupported adjustment update'))
    },
  }
})

// Backend rows can carry nulls/strings for numeric fields; the table and
// summary cards do arithmetic and formatting on them.
function normalizeAdjustment(d) {
  return {
    ...d,
    report_number: d.report_number || `PC-${d.id}`,
    product_name: d.product_name || '—',
    variance: Number(d.variance) || 0,
    variance_percentage: Number(d.variance_percentage) || 0,
    write_off_amount: Number(d.write_off_amount) || 0,
  }
}

export default function AdjustmentApprovalsPage() {
  const [data, setData] = useState({ discrepancies: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [approvingId, setApprovingId] = useState(null)

  useEffect(() => {
    loadDiscrepancies()
    return discrepanciesSource.subscribe(all => {
      setData({ discrepancies: all.filter(d => d.requires_approval).map(normalizeAdjustment), loading: false })
    })
  }, [])

  const loadDiscrepancies = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const response = await discrepanciesSource.list()
      // Backend wraps in Laravel envelope { success, data: [...], message, timestamp }
      const discrepancies = response.data || response
      setData({ discrepancies: (Array.isArray(discrepancies) ? discrepancies : []).filter(d => d.requires_approval).map(normalizeAdjustment), loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: error?.message || 'Failed to load adjustment requests' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleApprove = async (disc) => {
    setApprovingId(disc.id)
    try {
      await discrepanciesSource.update(disc.id, {
        approval_status: 'approved',
        approved_by: 'Current User (Manager)',
        approved_at: new Date().toISOString(),
      })
      addNotification({ type: 'success', title: 'Write-off Approved', message: `${disc.report_number} approved for ${disc.product_name}` })
      loadDiscrepancies()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: error?.message || `Failed to approve ${disc.report_number}` })
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (disc) => {
    try {
      await discrepanciesSource.update(disc.id, {
        approval_status: 'rejected',
        approved_by: 'Current User (Manager)',
        approved_at: new Date().toISOString(),
        rejection_reason: 'Rejected by manager',
      })
      addNotification({ type: 'warning', title: 'Write-off Rejected', message: `${disc.report_number} has been rejected` })
      loadDiscrepancies()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: error?.message || `Failed to reject ${disc.report_number}` })
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

  const getApprovalBadge = (status) => {
    const map = {
      pending: { variant: 'warning', label: 'Pending Approval' },
      approved: { variant: 'ok', label: 'Approved' },
      rejected: { variant: 'critical', label: 'Rejected' },
    }
    const config = map[status] || { variant: 'neutral', label: status || 'Not Sent' }
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
    { key: 'report_number', label: 'Report #', sortable: true },
    {
      key: 'product_name',
      label: 'Product',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.product_name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.product_sku}</div>
        </div>
      )
    },
    { key: 'variance', label: 'Variance', render: (_, row) => `${row.variance > 0 ? '+' : ''}${row.variance} (${Number(row.variance_percentage || 0).toFixed(1)}%)` },
    { key: 'write_off_amount', label: 'Write-off', render: (val) => val ? `₱${val.toLocaleString()}` : '—' },
    { key: 'priority', label: 'Priority', render: (val) => getPriorityBadge(val) },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'created_at', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'approval_status', label: 'Status', render: (val) => getApprovalBadge(val) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => row.approval_status === 'pending' ? (
        <div className="flex space-x-2">
          <Button size="sm" variant="primary" icon={CheckCircle} loading={approvingId === row.id} disabled={approvingId === row.id || rejecting} onClick={() => handleApprove(row)}>Approve</Button>
          <Button size="sm" variant="danger" icon={XCircle} disabled={approvingId === row.id || rejecting} onClick={() => setRejectTarget(row)}>Reject</Button>
        </div>
      ) : null
    },
  ]

  const filteredDiscrepancies = (data.discrepancies || [])
    .filter(d => filterStatus === 'all' || (d.approval_status || 'not_sent') === filterStatus)
    .filter(d => (d.report_number || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()))

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading adjustment requests..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Adjustment Approvals" subtitle="Review significant stock adjustments and write-offs flagged by Inventory" icon={ClipboardCheck} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.discrepancies || []).filter(d => d.approval_status === 'pending').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.discrepancies || []).filter(d => d.approval_status === 'approved').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Approved</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">₱{((data.discrepancies || []).filter(d => d.approval_status === 'pending').reduce((s, d) => s + (d.write_off_amount || 0), 0) / 1000).toFixed(0)}K</p><p className="text-sm text-gray-600 dark:text-gray-400">Pending Write-off Value</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by report number or product..." className="w-full sm:max-w-md" />
            <div className="flex flex-wrap gap-2">
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === s ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table
            data={filteredDiscrepancies}
            columns={columns}
            emptyMessage="No adjustment requests match your filters"
            highlightRowId={highlightRowId}
            views={['list', 'card']}
            viewStorageKey="adjustment-approvals"
            getRowId={(row) => row.id}
          />
        </Card.Body>
      </Card>

      <ConfirmModal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title="Reject Write-off"
        message={rejectTarget ? `Are you sure you want to reject the write-off for ${rejectTarget.report_number} (${rejectTarget.product_name})?` : ''}
        confirmText="Reject"
        variant="danger"
        loading={rejecting}
      />
    </div>
  )
}
