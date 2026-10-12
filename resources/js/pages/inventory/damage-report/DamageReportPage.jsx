/**
 * Damage Report Page - Inventory Staff
 * Track and report damaged inventory items
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Camera, FileText, Edit, Trash2 } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner, ConfirmModal } from '@/shared/components/common'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import Input, { NumberInput } from '@/shared/components/common/Input'
import Select from '@/shared/components/common/Select'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: inventoryApi } once the endpoint exists
const damageSource = createResourceDataSource('inventory/damage-report')

const DAMAGE_TYPES = ['Physical Damage', 'Water Damage', 'Cosmetic Damage', 'Electrical Fault', 'Packaging Damage']
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

  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadDamageReports()
  }, [])

  const loadDamageReports = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await damageSource.list()
      setData({ reports: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load damage reports' })
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
      damage_type: report.damage_type,
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
      addNotification({ type: 'error', title: 'Error', message: `Failed to ${editingReport ? 'update' : 'create'} damage report` })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await damageSource.delete(deleteTarget.id)
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
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete damage report' })
    } finally {
      setDeleting(false)
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
      resolved: { variant: 'ok', label: 'Resolved' },
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
    { key: 'reported_at', label: 'Reported', render: (val) => new Date(val).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(row)}>
            Delete
          </Button>
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
                value={form.product_name}
                onChange={(e) => setForm(f => ({ ...f, product_name: e.target.value }))}
                error={formErrors.product_name}
                placeholder="e.g. Samsung Refrigerator 21cu"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="dr-sku"
                  label="SKU"
                  value={form.sku}
                  onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. SAMSUNG-RF21"
                />
                <Input
                  id="dr-batch"
                  label="Batch Number"
                  required
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
    </div>
  )
}
