/**
 * Damage Report Page - Inventory Staff
 * Track and report damaged inventory items
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Camera, FileText, Edit, Trash2 } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Select, SearchBar, LoadingSpinner, Modal, ModalBody, ModalFooter, ConfirmModal } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockDamageReports } from '@/shared/mocks/inventory/damage-report'
// TODO: import { inventoryApi } from '@/api'

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'under_investigation', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'written_off', label: 'Written Off' },
]

const emptyForm = { product_name: '', batch_number: '', damage_type: '', severity: 'minor', quantity_affected: '', status: 'pending_review' }

export default function DamageReportPage() {
  const [data, setData] = useState({ reports: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  const [formOpen, setFormOpen] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadDamageReports()
  }, [])

  const loadDamageReports = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockDamageReports,
        () => null // TODO: inventoryApi.getDamageReports()
      )
      setData({ reports: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load damage reports' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const openAddModal = () => {
    setEditingReport(null)
    setForm(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditModal = (report) => {
    setEditingReport(report)
    setForm({
      product_name: report.product_name,
      batch_number: report.batch_number,
      damage_type: report.damage_type,
      severity: report.severity,
      quantity_affected: String(report.quantity_affected),
      status: report.status,
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setFormOpen(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.product_name.trim()) errors.product_name = 'Product name is required'
    if (!form.batch_number.trim()) errors.batch_number = 'Batch number is required'
    if (!form.damage_type.trim()) errors.damage_type = 'Damage type is required'
    if (form.quantity_affected === '' || Number(form.quantity_affected) <= 0) errors.quantity_affected = 'Enter a valid quantity'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload = {
        product_name: form.product_name.trim(),
        batch_number: form.batch_number.trim(),
        damage_type: form.damage_type.trim(),
        severity: form.severity,
        quantity_affected: Number(form.quantity_affected),
        status: form.status,
      }

      if (editingReport) {
        setData(prev => ({
          ...prev,
          reports: prev.reports.map(r => r.id === editingReport.id ? { ...r, ...payload } : r)
        }))
        addNotification({ type: 'success', title: 'Report Updated', message: `Damage report for ${payload.product_name} has been updated` })
      } else {
        const newReport = {
          id: Math.max(0, ...data.reports.map(r => r.id)) + 1,
          ...payload,
          reported_at: new Date().toISOString(),
        }
        setData(prev => ({ ...prev, reports: [newReport, ...prev.reports] }))
        addNotification({ type: 'success', title: 'Report Created', message: `Damage report for ${payload.product_name} has been logged` })
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      setData(prev => ({ ...prev, reports: prev.reports.filter(r => r.id !== deleteTarget.id) }))
      addNotification({ type: 'success', title: 'Report Removed', message: `Damage report for ${deleteTarget.product_name} has been removed` })
      setDeleteTarget(null)
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
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>Edit</Button>
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(row)}>Delete</Button>
      </div>
    )},
  ]

  const filteredReports = data.reports.filter(r =>
    r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.damage_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading damage reports..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Damage Reports" subtitle="Track and manage damaged inventory" icon={AlertCircle} />

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search reports..." className="w-full sm:max-w-md" />
            <Button variant="primary" icon={Plus} onClick={openAddModal} className="w-full sm:w-auto">New Report</Button>
          </div>
          <Table data={filteredReports} columns={columns} emptyMessage="No damage reports found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.filter(r => r.status === 'pending_review').length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.filter(r => r.status === 'under_investigation').length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Under Investigation</p>
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Camera className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.reduce((sum, r) => sum + r.quantity_affected, 0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items Affected</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Add/Edit Damage Report Modal */}
      <Modal isOpen={formOpen} onClose={closeFormModal} title={editingReport ? 'Edit Damage Report' : 'New Damage Report'} size="md">
        <form onSubmit={handleSubmitForm}>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Product Name"
                required
                value={form.product_name}
                onChange={(e) => setForm(prev => ({ ...prev, product_name: e.target.value }))}
                error={formErrors.product_name}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Batch Number"
                  required
                  value={form.batch_number}
                  onChange={(e) => setForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  error={formErrors.batch_number}
                />
                <Input
                  label="Damage Type"
                  required
                  value={form.damage_type}
                  onChange={(e) => setForm(prev => ({ ...prev, damage_type: e.target.value }))}
                  error={formErrors.damage_type}
                  placeholder="Water damage, dent, etc."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Severity"
                  required
                  value={form.severity}
                  onChange={(e) => setForm(prev => ({ ...prev, severity: e.target.value }))}
                  options={SEVERITY_OPTIONS}
                />
                <Input
                  label="Quantity Affected"
                  type="number"
                  min="1"
                  required
                  value={form.quantity_affected}
                  onChange={(e) => setForm(prev => ({ ...prev, quantity_affected: e.target.value }))}
                  error={formErrors.quantity_affected}
                />
              </div>
              <Select
                label="Status"
                required
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                options={STATUS_OPTIONS}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeFormModal} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>{editingReport ? 'Save Changes' : 'Create Report'}</Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Damage Report"
        message={deleteTarget ? `Are you sure you want to remove the damage report for ${deleteTarget.product_name}? This cannot be undone.` : ''}
        confirmText="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
