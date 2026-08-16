/**
 * Discrepancies Page - Warehouse Staff
 * Report and track inventory discrepancies and physical count variances
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, FileText, CheckCircle, Clock } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Modal, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: inventoryApi } once the endpoint exists
const discrepanciesSource = createResourceDataSource('warehouse/discrepancies')




export default function DiscrepanciesPage() {
  const [data, setData] = useState({
    discrepancies: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewDiscrepancyModal, setShowNewDiscrepancyModal] = useState(false)
  const [newDiscrepancyForm, setNewDiscrepancyForm] = useState({
    product_id: '',
    expected_quantity: 0,
    actual_quantity: 0,
    discrepancy_type: 'shortage',
    location: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
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
        resolved_at: null
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
      setNewDiscrepancyForm({
        product_id: '',
        expected_quantity: 0,
        actual_quantity: 0,
        discrepancy_type: 'shortage',
        location: '',
        notes: ''
      })
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

  const handleUpdateStatus = async (discrepancy, newStatus) => {
    try {
      const patch = { status: newStatus }
      if (newStatus === 'resolved') patch.resolved_at = new Date().toISOString()
      await discrepanciesSource.update(discrepancy.id, patch)
      setData(prev => ({
        ...prev,
        discrepancies: prev.discrepancies.map(d => d.id === discrepancy.id ? { ...d, ...patch } : d)
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
    {
      key: 'report_number',
      label: 'Report #',
      sortable: true,
    },
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
      render: (value) => (
        <span className="capitalize">{value}</span>
      )
    },
    {
      key: 'location',
      label: 'Location',
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => getPriorityBadge(value)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'created_at',
      label: 'Reported',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ]

  const statusOptions = ['all', 'open', 'investigating', 'resolved']
  const filteredDiscrepancies = data.discrepancies.filter(disc => {
    const matchesSearch = disc.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discrepancy Reports"
        subtitle="Track and resolve inventory variances"
        icon={AlertCircle}
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowNewDiscrepancyModal(true)}
          >
            Report Discrepancy
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
              className="form-input w-full sm:w-auto"
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
            onKanbanMove={(row, newStatus) => handleUpdateStatus(row, newStatus)}
          />
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.discrepancies.filter(disc => disc.status === 'open').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Reports</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.discrepancies.filter(disc => disc.status === 'investigating').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Under Investigation</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.discrepancies.filter(disc => disc.status === 'resolved').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.discrepancies.filter(disc => disc.priority === 'high').length}
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
        onClose={() => setShowNewDiscrepancyModal(false)}
        title="Report New Discrepancy"
        size="lg"
      >
        <form onSubmit={handleSubmitDiscrepancy} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Product/SKU</label>
              <Input
                type="text"
                value={newDiscrepancyForm.product_id}
                onChange={(e) => setNewDiscrepancyForm(prev => ({
                  ...prev,
                  product_id: e.target.value
                }))}
                placeholder="Enter product SKU or name"
                required
              />
            </div>

            <div>
              <label className="form-label">Location</label>
              <Input
                type="text"
                value={newDiscrepancyForm.location}
                onChange={(e) => setNewDiscrepancyForm(prev => ({
                  ...prev,
                  location: e.target.value
                }))}
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
                onChange={(e) => setNewDiscrepancyForm(prev => ({
                  ...prev,
                  expected_quantity: Number(e.target.value)
                }))}
                min="0"
                required
              />
            </div>

            <div>
              <label className="form-label">Actual Quantity</label>
              <Input
                type="number"
                value={newDiscrepancyForm.actual_quantity}
                onChange={(e) => setNewDiscrepancyForm(prev => ({
                  ...prev,
                  actual_quantity: Number(e.target.value)
                }))}
                min="0"
                required
              />
            </div>

            <div>
              <label className="form-label">Discrepancy Type</label>
              <select
                value={newDiscrepancyForm.discrepancy_type}
                onChange={(e) => setNewDiscrepancyForm(prev => ({
                  ...prev,
                  discrepancy_type: e.target.value
                }))}
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
              onChange={(e) => setNewDiscrepancyForm(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              className="form-input"
              rows={3}
              placeholder="Describe the discrepancy, possible causes, or additional context..."
            />
          </div>

          {/* Variance Display */}
          {(newDiscrepancyForm.expected_quantity > 0 && newDiscrepancyForm.actual_quantity >= 0) && (
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

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewDiscrepancyModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}