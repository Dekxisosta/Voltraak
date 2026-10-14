/**
 * Damage Report Page - Inventory Staff
 * Track and report damaged inventory items
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Camera, FileText, Edit, Trash2, CheckCircle, XCircle, Search } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner, ConfirmModal } from '@/shared/components/common'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import Input, { NumberInput } from '@/shared/components/common/Input'
import Select from '@/shared/components/common/Select'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { useAuth } from '@/shared/contexts/AuthContext'
import { createResourceDataSource, mutateData } from '@/shared/services/dataSource'
import { inventoryApi } from '@/shared/api/inventory'
import { damageReportApi, DAMAGE_TYPE_OPTIONS, describeError } from '@/shared/api/inventoryMappers'
// In API mode the rows are the backend's damage reports (see damageReportApi)
const damageSource = createResourceDataSource('inventory/damage-report', { api: damageReportApi })

// Damage types the backend accepts
const DAMAGE_TYPES = DAMAGE_TYPE_OPTIONS.map(o => o.label)
const SEVERITIES = [
  { label: 'Minor', value: 'minor' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Severe', value: 'severe' },
]
const EMPTY_FORM = {
  product_name: '', sku: '', batch_number: '', damage_type: 'Physical Damage',
  severity: 'minor', quantity_affected: 1, notes: '',
}

export default function DamageReportPage() {
  const [data, setData] = useState({ reports: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')

  // Create / edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState(null) // null = create mode
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Approve/Reject modal state
  const [reviewModal, setReviewModal] = useState({ isOpen: false, report: null, action: null })
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  // Investigation modal state
  const [investigationModal, setInvestigationModal] = useState({ isOpen: false, report: null })
  const [investigationForm, setInvestigationForm] = useState({ notes: '', action: '' })
  const [investigating, setInvestigating] = useState(false)

  const { addNotification } = useNotifications()
  const { hasAnyRole, user } = useAuth()
  const highlightRowId = useHighlightParam()

  // Check if current user can approve/reject (managers and admins)
  const canReview = hasAnyRole(['manager', 'admin'])
  // Inventory staff (and above) run the investigation that precedes review
  const canInvestigate = hasAnyRole(['inventory_staff', 'manager', 'admin'])
  const isMock = damageSource.isUsingMocks
  // The backend only lets a manager decide once the investigation is complete;
  // the mock data has no investigation step, so reports are reviewable as soon
  // as they are reported.
  const isReviewable = (status) => (isMock ? status === 'pending_review' : status === 'investigated')

  useEffect(() => {
    loadDamageReports()
  }, [])

  const loadDamageReports = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await damageSource.list()
      setData({ reports: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: describeError(error, 'Failed to load damage reports') })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const openCreateModal = () => {
    setEditingReport(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (report) => {
    setEditingReport(report)
    setForm({
      product_name: report.product_name,
      sku: report.sku ?? '',
      batch_number: report.batch_number,
      damage_type: DAMAGE_TYPES.includes(report.damage_type) ? report.damage_type : 'Other',
      severity: report.severity,
      quantity_affected: report.quantity_affected,
      notes: report.notes ?? '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.product_name.trim()) errors.product_name = 'Product name is required'
    if (!form.batch_number.trim()) errors.batch_number = 'Batch number is required'
    if (!Number(form.quantity_affected) || Number(form.quantity_affected) < 1)
      errors.quantity_affected = 'Enter a quantity of at least 1'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    try {
      const payload = {
        product_name: form.product_name.trim(),
        sku: form.sku.trim(),
        batch_number: form.batch_number.trim(),
        damage_type: form.damage_type,
        severity: form.severity,
        quantity_affected: Number(form.quantity_affected),
        notes: form.notes.trim(),
      }

      if (editingReport) {
        await damageSource.update(editingReport.id, payload)
        setData(prev => ({
          ...prev,
          reports: prev.reports.map(r =>
            r.id === editingReport.id ? { ...r, ...payload } : r
          )
        }))
        addNotification({
          type: 'success',
          title: 'Report Updated',
          message: `Damage report for ${payload.product_name} updated`
        })
      } else {
        const newReport = await damageSource.create({
          ...payload,
          status: 'pending_review',
          reported_by: 'Inventory Staff',
          reported_at: new Date().toISOString(),
        })
        setData(prev => ({ ...prev, reports: [newReport, ...prev.reports] }))
        addNotification({
          type: 'success',
          title: 'Report Created',
          message: `Damage report for ${payload.product_name} submitted`
        })
      }

      setModalOpen(false)
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: describeError(error, `Failed to ${editingReport ? 'update' : 'create'} damage report`) })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await damageSource.remove(deleteTarget.id)
      setData(prev => ({
        ...prev,
        reports: prev.reports.filter(r => r.id !== deleteTarget.id)
      }))
      addNotification({
        type: 'success',
        title: 'Report Deleted',
        message: `Damage report for ${deleteTarget.product_name} has been removed`
      })
      setDeleteTarget(null)
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: describeError(error, 'Failed to delete damage report') })
    } finally {
      setDeleting(false)
    }
  }

  const openReviewModal = (report, action) => {
    setReviewModal({ isOpen: true, report, action })
    setReviewNotes('')
  }

  const closeReviewModal = () => {
    if (reviewing) return
    setReviewModal({ isOpen: false, report: null, action: null })
    setReviewNotes('')
  }

  const handleReview = async () => {
    if (!reviewModal.report) return

    setReviewing(true)
    try {
      const reportId = reviewModal.report.id
      const isApproval = reviewModal.action === 'approve'
      const notes = reviewNotes.trim()

      if (isApproval) {
        await mutateData(
          () => damageSource.update(reportId, { status: 'written_off' }),
          () => inventoryApi.approveDamageReport(reportId, {
            resolution_notes: notes || 'Approved by manager'
          })
        )
      } else {
        await mutateData(
          () => damageSource.update(reportId, { status: 'resolved' }),
          () => inventoryApi.rejectDamageReport(reportId, {
            rejection_reason: notes || 'Rejected by manager'
          })
        )
      }

      if (isMock) {
        setData(prev => ({
          ...prev,
          reports: prev.reports.map(r =>
            r.id === reportId ? { ...r, status: isApproval ? 'written_off' : 'resolved' } : r
          )
        }))
      } else {
        // The backend decides the resulting status (and writes the stock off).
        await refreshReports()
      }

      addNotification(isApproval
        ? { type: 'success', title: 'Report Approved', message: 'Damage report approved and inventory adjusted' }
        : { type: 'success', title: 'Report Rejected', message: 'Damage report rejected' })

      closeReviewModal()
    } catch (error) {
      console.error('Error reviewing damage report:', error)
      addNotification({
        type: 'error',
        title: 'Review Error',
        message: describeError(error, 'Failed to review damage report')
      })
    } finally {
      setReviewing(false)
    }
  }

  // Re-read the list without the full-page spinner
  const refreshReports = async () => {
    const result = await damageSource.list()
    setData({ reports: result, loading: false })
  }

  // Investigation: staff take a report on, then record their findings, after
  // which it is ready for a manager's decision.
  const handleStartInvestigation = async (report) => {
    try {
      await mutateData(
        () => damageSource.update(report.id, { status: 'under_investigation' }),
        () => inventoryApi.assignDamageInvestigator(report.id, { investigator_id: user?.id })
      )
      await refreshReports()
      addNotification({
        type: 'success',
        title: 'Investigation Started',
        message: `You are now investigating the damage report for ${report.product_name}`
      })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: describeError(error, 'Failed to start investigation') })
    }
  }

  const openInvestigationModal = (report) => {
    setInvestigationModal({ isOpen: true, report })
    setInvestigationForm({ notes: '', action: '' })
  }

  const closeInvestigationModal = () => {
    if (investigating) return
    setInvestigationModal({ isOpen: false, report: null })
  }

  const handleCompleteInvestigation = async () => {
    const report = investigationModal.report
    if (!report) return
    if (!investigationForm.notes.trim()) {
      addNotification({ type: 'error', title: 'Error', message: 'Investigation notes are required' })
      return
    }

    setInvestigating(true)
    try {
      await mutateData(
        () => damageSource.update(report.id, { status: 'investigated' }),
        () => inventoryApi.completeDamageInvestigation(report.id, {
          investigation_notes: investigationForm.notes.trim(),
          action_taken: investigationForm.action.trim() || null,
        })
      )
      await refreshReports()
      addNotification({
        type: 'success',
        title: 'Investigation Completed',
        message: `Damage report for ${report.product_name} is ready for manager review`
      })
      setInvestigationModal({ isOpen: false, report: null })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: describeError(error, 'Failed to complete investigation') })
    } finally {
      setInvestigating(false)
    }
  }

  const getSeverityBadge = (severity) => {
    const map = {
      minor: { variant: 'warning', label: 'Minor' },
      moderate: { variant: 'warning', label: 'Moderate' },
      severe: { variant: 'critical', label: 'Severe' },
    }
    const config = map[severity] || { variant: 'neutral', label: severity }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const getStatusBadge = (status) => {
    const map = {
      pending_review: { variant: 'warning', label: 'Pending Review' },
      under_investigation: { variant: 'warning', label: 'Investigating' },
      investigated: { variant: 'warning', label: 'Awaiting Approval' },
      resolved: { variant: 'ok', label: 'Resolved' },
      rejected: { variant: 'neutral', label: 'Rejected' },
      written_off: { variant: 'critical', label: 'Written Off' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'batch_number', label: 'Batch' },
    { key: 'damage_type', label: 'Type' },
    { key: 'severity', label: 'Severity', render: (val) => getSeverityBadge(val) },
    { key: 'quantity_affected', label: 'Qty Affected' },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'reported_at', label: 'Reported', render: (val) => (val ? new Date(val).toLocaleDateString() : '—') },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          {/* Investigation workflow */}
          {!isMock && canInvestigate && row.status === 'pending_review' && (
            <Button size="sm" variant="secondary" icon={Search} onClick={() => handleStartInvestigation(row)}>
              Investigate
            </Button>
          )}
          {!isMock && canInvestigate && row.status === 'under_investigation' && (
            <Button size="sm" variant="primary" icon={FileText} onClick={() => openInvestigationModal(row)}>
              Complete Investigation
            </Button>
          )}

          {/* Manager review actions */}
          {canReview && isReviewable(row.status) && (
            <>
              <Button 
                size="sm" 
                variant="success" 
                icon={CheckCircle} 
                onClick={() => openReviewModal(row, 'approve')}
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="danger" 
                icon={XCircle} 
                onClick={() => openReviewModal(row, 'reject')}
              >
                Reject
              </Button>
            </>
          )}
          
          {/* Edit/Delete for non-resolved reports */}
          {row.status === 'pending_review' && (
            <>
              <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(row)}>
                Delete
              </Button>
            </>
          )}
        </div>
      )
    },
  ]

  const filteredReports = data.reports.filter(r =>
    r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.damage_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading damage reports..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Damage Reports" subtitle="Track and manage damaged inventory" icon={AlertCircle} />

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search reports..."
              className="w-full sm:max-w-md"
            />
            <Button variant="primary" icon={Plus} className="w-full sm:w-auto" onClick={openCreateModal}>
              New Report
            </Button>
          </div>
          <Table
            data={filteredReports}
            columns={columns}
            emptyMessage="No damage reports found"
            highlightRowId={highlightRowId}
          />
        </Card.Body>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredReports.filter(r => r.status === 'pending_review').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
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
                  {filteredReports.filter(r => r.status === 'under_investigation').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Under Investigation</p>
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Camera className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredReports.reduce((sum, r) => sum + r.quantity_affected, 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items Affected</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingReport ? 'Edit Damage Report' : 'New Damage Report'}
        size="md"
      >
        <form onSubmit={handleSave}>
          <ModalBody>
            <div className="space-y-4">
              <Input
                id="dr-product"
                label="Product Name"
                required
                disabled={Boolean(editingReport) && !isMock}
                value={form.product_name}
                onChange={(e) => setForm(f => ({ ...f, product_name: e.target.value }))}
                error={formErrors.product_name}
                placeholder="e.g. Samsung Refrigerator 21cu"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="dr-sku"
                  label="SKU"
                  disabled={Boolean(editingReport) && !isMock}
                  value={form.sku}
                  onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. SAMSUNG-RF21"
                />
                <Input
                  id="dr-batch"
                  label="Batch Number"
                  required
                  disabled={Boolean(editingReport) && !isMock}
                  value={form.batch_number}
                  onChange={(e) => setForm(f => ({ ...f, batch_number: e.target.value }))}
                  error={formErrors.batch_number}
                  placeholder="e.g. BATCH-2024-001"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="dr-type"
                  label="Damage Type"
                  value={form.damage_type}
                  onChange={(e) => setForm(f => ({ ...f, damage_type: e.target.value }))}
                  options={DAMAGE_TYPES.map(t => ({ label: t, value: t }))}
                />
                <Select
                  id="dr-severity"
                  label="Severity"
                  value={form.severity}
                  onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}
                  options={SEVERITIES}
                />
              </div>
              <NumberInput
                id="dr-qty"
                label="Quantity Affected"
                required
                min={1}
                value={form.quantity_affected}
                onChange={(e) => setForm(f => ({ ...f, quantity_affected: e.target.value }))}
                error={formErrors.quantity_affected}
              />
              <Input
                id="dr-notes"
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Describe the damage (optional)"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                icon={editingReport ? Edit : Plus}
                className="w-full sm:w-auto"
              >
                {editingReport ? 'Save Changes' : 'Submit Report'}
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        title="Delete Damage Report"
        message={deleteTarget
          ? `Delete the damage report for ${deleteTarget.product_name} (${deleteTarget.batch_number})? This action cannot be undone.`
          : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />

      {/* Investigation Modal */}
      <Modal
        isOpen={investigationModal.isOpen}
        onClose={closeInvestigationModal}
        title="Complete Investigation"
        size="md"
      >
        <ModalBody>
          {investigationModal.report && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Record what you found for {investigationModal.report.product_name} ({investigationModal.report.batch_number}).
                The report then goes to a manager for approval.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Investigation Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={investigationForm.notes}
                  onChange={(e) => setInvestigationForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="What caused the damage and how was it verified?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action Taken
                </label>
                <textarea
                  value={investigationForm.action}
                  onChange={(e) => setInvestigationForm(f => ({ ...f, action: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Quarantined affected units (optional)"
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeInvestigationModal} disabled={investigating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCompleteInvestigation} loading={investigating} icon={FileText}>
              Submit Findings
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Review Modal (Approve/Reject) */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={closeReviewModal}
        title={reviewModal.action === 'approve' ? 'Approve Damage Report' : 'Reject Damage Report'}
        size="md"
      >
        <ModalBody>
          {reviewModal.report && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {reviewModal.report.product_name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Batch:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">{reviewModal.report.batch_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">{reviewModal.report.quantity_affected}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">{reviewModal.report.damage_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Severity:</span>{' '}
                    {getSeverityBadge(reviewModal.report.severity)}
                  </div>
                </div>
                {reviewModal.report.notes && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Notes:</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{reviewModal.report.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {reviewModal.action === 'approve' ? 'Resolution Notes' : 'Rejection Reason'}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={
                    reviewModal.action === 'approve'
                      ? 'Explain the resolution (optional)'
                      : 'Explain why this report is being rejected (optional)'
                  }
                />
              </div>

              {reviewModal.action === 'approve' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Approving this report will create a stock adjustment to write off the damaged inventory.
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeReviewModal} disabled={reviewing}>
              Cancel
            </Button>
            <Button
              variant={reviewModal.action === 'approve' ? 'success' : 'danger'}
              onClick={handleReview}
              disabled={reviewing}
              icon={reviewModal.action === 'approve' ? CheckCircle : XCircle}
            >
              {reviewing ? 'Processing...' : reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  )
}
