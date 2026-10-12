/**
 * Discrepancies Page - Inventory Staff
 * Investigate and resolve discrepancy reports and physical count variances.
 *
 * Warehouse Staff can only raise a concern (see
 * warehouse/report-discrepancy/ReportDiscrepancyPage.jsx) — this page is where
 * that concern actually gets triaged. Reports whose variance is large
 * enough to need a stock write-off get sent to the Manager's Adjustment
 * Approvals page via "Send for Approval" below.
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, FileText, CheckCircle, Clock, RotateCcw, Send } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Modal, ModalBody, ModalFooter, ConfirmModal, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: inventoryApi } once the endpoint exists
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')

const EMPTY_FORM = {
  product_id: '',
  expected_quantity: 0,
  actual_quantity: 0,
  discrepancy_type: 'shortage',
  location: '',
  notes: ''
}

export default function DiscrepanciesPage() {
  const [data, setData] = useState({
    discrepancies: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isKanbanView, setIsKanbanView] = useState(false)

  // Create modal
  const [showNewDiscrepancyModal, setShowNewDiscrepancyModal] = useState(false)
  const [newDiscrepancyForm, setNewDiscrepancyForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Status-change confirm modals
  // actionTarget: { discrepancy, nextStatus }
  const [actionTarget, setActionTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Send-for-approval confirm modal
  const [approvalTarget, setApprovalTarget] = useState(null)
  const [approvalLoading, setApprovalLoading] = useState(false)

  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadDiscrepancies()
  }, [])

  const loadDiscrepancies = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await discrepanciesSource.list()
      setData({ discrepancies: result, loading: false })
    } catch (error) {
      console.error('Error loading discrepancies:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load discrepancy reports'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleSubmitDiscrepancy = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const reportNumber = `DISC-2024-${String(data.discrepancies.length + 1).padStart(3, '0')}`
      const newDiscrepancy = await discrepanciesSource.create({
        report_number: reportNumber,
        product_name: 'Sample Product',
        product_sku: 'SAMPLE-SKU',
        expected_quantity: newDiscrepancyForm.expected_quantity,
        actual_quantity: newDiscrepancyForm.actual_quantity,
        variance: newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity,
        variance_percentage: ((newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity) / newDiscrepancyForm.expected_quantity) * 100,
        discrepancy_type: newDiscrepancyForm.discrepancy_type,
        location: newDiscrepancyForm.location,
        reported_by: 'Current User',
        status: 'open',
        priority: Math.abs(newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity) > 2 ? 'high' : 'medium',
        notes: newDiscrepancyForm.notes,
        created_at: new Date().toISOString(),
        resolved_at: null,
        requires_approval: Math.abs(((newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity) / (newDiscrepancyForm.expected_quantity || 1)) * 100) > 5,
        approval_status: null,
        write_off_amount: null,
        approved_by: null,
        approved_at: null,
      })

      setData(prev => ({
        ...prev,
        discrepancies: [newDiscrepancy, ...prev.discrepancies]
      }))

      addNotification({
        type: 'success',
        title: 'Discrepancy Reported',
        message: `Report ${newDiscrepancy.report_number} created successfully`
      })

      setShowNewDiscrepancyModal(false)
      setNewDiscrepancyForm(EMPTY_FORM)
    } catch (error) {
      console.error('Error submitting discrepancy:', error)
      addNotification({
        type: 'error',
        title: 'Submission Error',
        message: 'Failed to create discrepancy report'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Called after the user confirms a status-change action
  const handleConfirmStatusChange = async () => {
    if (!actionTarget) return
    const { discrepancy, nextStatus } = actionTarget
    setActionLoading(true)
    try {
      const patch = { status: nextStatus }
      if (nextStatus === 'resolved') patch.resolved_at = new Date().toISOString()
      await discrepanciesSource.update(discrepancy.id, patch)
      setData(prev => ({
        ...prev,
        discrepancies: prev.discrepancies.map(d =>
          d.id === discrepancy.id ? { ...d, ...patch } : d
        )
      }))
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `${discrepancy.report_number} moved to ${nextStatus}`
      })
      setActionTarget(null)
    } catch (error) {
      addNotification({ type: 'error', title: 'Update Error', message: 'Failed to update discrepancy status' })
    } finally {
      setActionLoading(false)
    }
  }

  // Called after the user confirms sending for approval
  const handleConfirmSendForApproval = async () => {
    if (!approvalTarget) return
    setApprovalLoading(true)
    try {
      const patch = { approval_status: 'pending' }
      await discrepanciesSource.update(approvalTarget.id, patch)
      setData(prev => ({
        ...prev,
        discrepancies: prev.discrepancies.map(d =>
          d.id === approvalTarget.id ? { ...d, ...patch } : d
        )
      }))
      addNotification({
        type: 'success',
        title: 'Sent for Approval',
        message: `${approvalTarget.report_number} sent to Manager for write-off approval`
      })
      setApprovalTarget(null)
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to send for approval' })
    } finally {
      setApprovalLoading(false)
    }
  }

  // Direct kanban drag-and-drop still applies the change immediately
  const handleKanbanMove = async (discrepancy, newStatus) => {
    try {
      const patch = { status: newStatus }
      if (newStatus === 'resolved') patch.resolved_at = new Date().toISOString()
      await discrepanciesSource.update(discrepancy.id, patch)
      setData(prev => ({
        ...prev,
        discrepancies: prev.discrepancies.map(d =>
          d.id === discrepancy.id ? { ...d, ...patch } : d
        )
      }))
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `${discrepancy.report_number} moved to ${newStatus}`
      })
    } catch (error) {
      addNotification({ type: 'error', title: 'Update Error', message: 'Failed to update discrepancy status' })
    }
  }

  const handleViewChange = (view) => {
    setIsKanbanView(view === 'kanban')
    if (view === 'kanban') setStatusFilter('all')
  }

  // Build confirm modal copy based on next status
  const getActionModalProps = () => {
    if (!actionTarget) return { title: '', message: '', confirmText: '', variant: 'primary' }
    const { discrepancy, nextStatus } = actionTarget
    switch (nextStatus) {
      case 'investigating':
        return {
          title: 'Start Investigation',
          message: `Mark ${discrepancy.report_number} as "Investigating"? This signals that the variance is being actively looked into.`,
          confirmText: 'Start Investigation',
          variant: 'warning',
        }
      case 'resolved':
        return {
          title: 'Resolve Discrepancy',
          message: `Mark ${discrepancy.report_number} as "Resolved"? Ensure the root cause has been identified and corrective action taken before closing.`,
          confirmText: 'Mark Resolved',
          variant: 'primary',
        }
      case 'open':
        return {
          title: 'Reopen Discrepancy',
          message: `Reopen ${discrepancy.report_number}? It will be moved back to "Open" and require investigation again.`,
          confirmText: 'Reopen',
          variant: 'danger',
        }
      default:
        return { title: 'Confirm', message: '', confirmText: 'Confirm', variant: 'primary' }
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <StatusBadge variant="ok" label="Resolved" icon={CheckCircle} />
      case 'investigating':
        return <StatusBadge variant="warning" label="Investigating" icon={Clock} />
      case 'open':
        return <StatusBadge variant="critical" label="Open" icon={AlertCircle} />
      default:
        return <StatusBadge variant="neutral" label="Unknown" />
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <StatusBadge variant="critical" label="High" />
      case 'medium':
        return <StatusBadge variant="warning" label="Medium" />
      case 'low':
        return <StatusBadge variant="neutral" label="Low" />
      default:
        return <StatusBadge variant="neutral" label="Normal" />
    }
  }

  const getApprovalBadge = (row) => {
    if (!row.requires_approval) return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
    switch (row.approval_status) {
      case 'pending':
        return <StatusBadge variant="warning" label="Pending Manager" icon={Clock} />
      case 'approved':
        return <StatusBadge variant="ok" label="Write-off Approved" icon={CheckCircle} />
      case 'rejected':
        return <StatusBadge variant="critical" label="Write-off Rejected" />
      default:
        return <StatusBadge variant="neutral" label="Not Sent" />
    }
  }

  const getVarianceBadge = (variance, percentage) => {
    const absPercentage = Math.abs(percentage)
    if (absPercentage > 10) {
      return <StatusBadge variant="critical" label={`${variance > 0 ? '+' : ''}${variance} (${percentage.toFixed(1)}%)`} />
    } else if (absPercentage > 5) {
      return <StatusBadge variant="warning" label={`${variance > 0 ? '+' : ''}${variance} (${percentage.toFixed(1)}%)`} />
    }
    return <StatusBadge variant="neutral" label={`${variance > 0 ? '+' : ''}${variance} (${percentage.toFixed(1)}%)`} />
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
    {
      key: 'expected_quantity',
      label: 'Expected vs Actual',
      render: (_, row) => (
        <div>
          <div className="text-sm">Expected: {row.expected_quantity}</div>
          <div className="text-sm">Actual: {row.actual_quantity}</div>
        </div>
      )
    },
    {
      key: 'variance',
      label: 'Variance',
      render: (_, row) => getVarianceBadge(row.variance, row.variance_percentage)
    },
    {
      key: 'discrepancy_type',
      label: 'Type',
      render: (value) => <span className="capitalize">{value}</span>
    },
    { key: 'location', label: 'Location' },
    { key: 'priority', label: 'Priority', render: (value) => getPriorityBadge(value) },
    { key: 'status', label: 'Status', render: (value) => getStatusBadge(value) },
    {
      key: 'created_at',
      label: 'Reported',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'approval_status',
      label: 'Write-off Approval',
      render: (_, row) => getApprovalBadge(row)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === 'open' && (
            <Button
              size="sm"
              variant="warning"
              icon={Clock}
              onClick={() => setActionTarget({ discrepancy: row, nextStatus: 'investigating' })}
            >
              Investigate
            </Button>
          )}
          {row.status === 'investigating' && (
            <Button
              size="sm"
              variant="primary"
              icon={CheckCircle}
              onClick={() => setActionTarget({ discrepancy: row, nextStatus: 'resolved' })}
            >
              Resolve
            </Button>
          )}
          {row.status === 'resolved' && (
            <Button
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              onClick={() => setActionTarget({ discrepancy: row, nextStatus: 'open' })}
            >
              Reopen
            </Button>
          )}
          {row.requires_approval && !row.approval_status && (
            <Button
              size="sm"
              variant="primary"
              icon={Send}
              onClick={() => setApprovalTarget(row)}
            >
              Send for Approval
            </Button>
          )}
        </div>
      )
    }
  ]

  const statusOptions = ['all', 'open', 'investigating', 'resolved']
  const filteredDiscrepancies = data.discrepancies.filter(disc => {
    const matchesSearch =
      disc.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disc.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disc.product_sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || disc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading discrepancy reports..." />
      </div>
    )
  }

  const actionModalProps = getActionModalProps()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discrepancy Reports"
        subtitle="Track and resolve inventory variances"
        icon={AlertCircle}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setShowNewDiscrepancyModal(true)}>
            Log Discrepancy
          </Button>
        }
      />

      <Card>
        <Card.Body>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search reports, products..."
              className="flex-1 max-w-md"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isKanbanView}
              title={isKanbanView ? 'Status filter is disabled in Kanban view — all statuses are shown across lanes' : undefined}
              className="form-input w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Table
            data={filteredDiscrepancies}
            columns={columns}
            emptyMessage="No discrepancy reports found"
            highlightRowId={highlightRowId}
            views={['list', 'card', 'kanban']}
            viewStorageKey="discrepancies"
            getRowId={(row) => row.id}
            kanbanBy="status"
            kanbanLanes={[
              { value: 'open', label: 'Open' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            onKanbanMove={handleKanbanMove}
            onViewChange={handleViewChange}
          />
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredDiscrepancies.filter(d => d.status === 'open').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Reports</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredDiscrepancies.filter(d => d.status === 'investigating').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Under Investigation</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredDiscrepancies.filter(d => d.status === 'resolved').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredDiscrepancies.filter(d => d.priority === 'high').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Priority</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* New Discrepancy Modal */}
      <Modal
        isOpen={showNewDiscrepancyModal}
        onClose={() => { if (!submitting) setShowNewDiscrepancyModal(false) }}
        title="Log New Discrepancy"
        size="lg"
      >
        <form onSubmit={handleSubmitDiscrepancy}>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Product / SKU</label>
                  <Input
                    type="text"
                    value={newDiscrepancyForm.product_id}
                    onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, product_id: e.target.value }))}
                    placeholder="Enter product SKU or name"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Location</label>
                  <Input
                    type="text"
                    value={newDiscrepancyForm.location}
                    onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., A-01-02"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Expected Quantity</label>
                  <Input
                    type="number"
                    value={newDiscrepancyForm.expected_quantity}
                    onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, expected_quantity: Number(e.target.value) }))}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Actual Quantity</label>
                  <Input
                    type="number"
                    value={newDiscrepancyForm.actual_quantity}
                    onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, actual_quantity: Number(e.target.value) }))}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Discrepancy Type</label>
                  <select
                    value={newDiscrepancyForm.discrepancy_type}
                    onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, discrepancy_type: e.target.value }))}
                    className="form-input"
                    required
                  >
                    <option value="shortage">Shortage</option>
                    <option value="overage">Overage</option>
                    <option value="damage">Damage</option>
                    <option value="theft">Theft</option>
                    <option value="misplacement">Misplacement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  value={newDiscrepancyForm.notes}
                  onChange={(e) => setNewDiscrepancyForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input"
                  rows={3}
                  placeholder="Describe the discrepancy, possible causes, or additional context..."
                />
              </div>

              {/* Live variance preview */}
              {newDiscrepancyForm.expected_quantity > 0 && newDiscrepancyForm.actual_quantity >= 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Calculated Variance</h4>
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Difference: </span>
                      <span className="font-medium">
                        {newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity} units
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Percentage: </span>
                      <span className="font-medium">
                        {(((newDiscrepancyForm.actual_quantity - newDiscrepancyForm.expected_quantity) / newDiscrepancyForm.expected_quantity) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { if (!submitting) setShowNewDiscrepancyModal(false) }}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full sm:w-auto"
              >
                Submit Report
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Status Change Confirm Modal (Investigate / Resolve / Reopen) */}
      <ConfirmModal
        isOpen={Boolean(actionTarget)}
        onClose={() => { if (!actionLoading) setActionTarget(null) }}
        onConfirm={handleConfirmStatusChange}
        title={actionModalProps.title}
        message={actionModalProps.message}
        confirmText={actionModalProps.confirmText}
        cancelText="Cancel"
        variant={actionModalProps.variant}
        loading={actionLoading}
      />

      {/* Send for Approval Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(approvalTarget)}
        onClose={() => { if (!approvalLoading) setApprovalTarget(null) }}
        onConfirm={handleConfirmSendForApproval}
        title="Send for Manager Approval"
        message={approvalTarget
          ? `Send ${approvalTarget.report_number} to the Manager for write-off approval? This flags the variance as requiring a stock adjustment sign-off.`
          : ''}
        confirmText="Send for Approval"
        cancelText="Cancel"
        variant="primary"
        loading={approvalLoading}
      />
    </div>
  )
}
