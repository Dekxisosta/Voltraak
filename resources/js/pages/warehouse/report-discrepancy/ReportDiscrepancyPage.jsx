/**
 * Report Discrepancy Page - Warehouse Staff
 *
 * Warehouse doesn't own discrepancy investigation/resolution — that's
 * Inventory's job (see pages/inventory/discrepancies/DiscrepanciesPage.jsx).
 * All Warehouse can do here is raise a concern: fill out what they counted
 * vs. what the system expects, confirm they want to send it, and it lands
 * in Inventory's queue as an 'open' report. No status changes, no
 * investigate/resolve actions live here.
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Send } from 'lucide-react'
import { Card, Button, Input, ConfirmModal, StatusBadge, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { createResourceDataSource } from '@/shared/services/dataSource'
// Same resource Inventory's DiscrepanciesPage reads/writes — Warehouse only
// ever calls .create() on it, never .update()/.remove().
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')

const emptyForm = {
  product_id: '',
  expected_quantity: 0,
  actual_quantity: 0,
  discrepancy_type: 'shortage',
  location: '',
  notes: '',
}

export default function ReportDiscrepancyPage() {
  const [form, setForm] = useState(emptyForm)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [recentReports, setRecentReports] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadRecentReports()
    return discrepanciesSource.subscribe(all => {
      setRecentReports(all.filter(d => d.reported_by === 'Warehouse Staff').slice(0, 5))
    })
  }, [])

  const loadRecentReports = async () => {
    try {
      setLoadingRecent(true)
      const all = await discrepanciesSource.list()
      setRecentReports(all.filter(d => d.reported_by === 'Warehouse Staff').slice(0, 5))
    } catch (error) {
      console.error('Error loading recent reports:', error)
    } finally {
      setLoadingRecent(false)
    }
  }

  const variance = form.actual_quantity - form.expected_quantity
  const variancePercentage = form.expected_quantity > 0
    ? (variance / form.expected_quantity) * 100
    : 0

  const handleOpenConfirm = (e) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setSubmitting(true)
    try {
      const all = await discrepanciesSource.list()
      const reportNumber = `DISC-2024-${String(all.length + 1).padStart(3, '0')}`
      const newDiscrepancy = await discrepanciesSource.create({
        report_number: reportNumber,
        product_name: form.product_id,
        product_sku: form.product_id,
        expected_quantity: form.expected_quantity,
        actual_quantity: form.actual_quantity,
        variance,
        variance_percentage: variancePercentage,
        discrepancy_type: form.discrepancy_type,
        location: form.location,
        reported_by: 'Warehouse Staff',
        status: 'open',
        priority: Math.abs(variance) > 2 ? 'high' : 'medium',
        notes: form.notes,
        created_at: new Date().toISOString(),
        resolved_at: null,
        requires_approval: Math.abs(variancePercentage) > 5,
        approval_status: null,
        write_off_amount: null,
        approved_by: null,
        approved_at: null,
      })

      setRecentReports(prev => [newDiscrepancy, ...prev].slice(0, 5))
      addNotification({
        type: 'success',
        title: 'Sent to Inventory',
        message: `${newDiscrepancy.report_number} has been raised with Inventory for review`
      })

      setForm(emptyForm)
      setShowConfirm(false)
    } catch (error) {
      console.error('Error submitting discrepancy:', error)
      addNotification({ type: 'error', title: 'Submission Error', message: 'Failed to send discrepancy to Inventory' })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <StatusBadge variant="ok" label="Resolved" />
      case 'investigating':
        return <StatusBadge variant="warning" label="Investigating" />
      case 'open':
        return <StatusBadge variant="critical" label="Open" />
      default:
        return <StatusBadge variant="neutral" label="Unknown" />
    }
  }

  const isValid = form.product_id && form.location && form.expected_quantity >= 0 && form.actual_quantity >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Discrepancy"
        subtitle="Flag a stock count mismatch for Inventory to investigate"
        icon={AlertCircle}
      />

      <Card>
        <Card.Body>
          <form onSubmit={handleOpenConfirm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Product/SKU</label>
                <Input
                  type="text"
                  value={form.product_id}
                  onChange={(e) => setForm(prev => ({ ...prev, product_id: e.target.value }))}
                  placeholder="Enter product SKU or name"
                  required
                />
              </div>

              <div>
                <label className="form-label">Location</label>
                <Input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
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
                  value={form.expected_quantity}
                  onChange={(e) => setForm(prev => ({ ...prev, expected_quantity: Number(e.target.value) }))}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="form-label">Actual (Counted) Quantity</label>
                <Input
                  type="number"
                  value={form.actual_quantity}
                  onChange={(e) => setForm(prev => ({ ...prev, actual_quantity: Number(e.target.value) }))}
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="form-label">Discrepancy Type</label>
                <select
                  value={form.discrepancy_type}
                  onChange={(e) => setForm(prev => ({ ...prev, discrepancy_type: e.target.value }))}
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
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="form-input"
                rows={3}
                placeholder="Describe what you observed during the count..."
              />
            </div>

            {form.expected_quantity > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-medium mb-2">Calculated Variance</h4>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Difference: </span>
                    <span className="font-medium">{variance} units</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Percentage: </span>
                    <span className="font-medium">{variancePercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" icon={Send} disabled={!isValid}>
                Raise with Inventory
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <h3 className="font-medium mb-4">Your Recent Reports</h3>
          {loadingRecent ? (
            <LoadingSpinner size="sm" message="Loading..." />
          ) : recentReports.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">You haven't reported any discrepancies yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentReports.map(r => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.report_number} — {r.product_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {r.location} · {r.variance > 0 ? '+' : ''}{r.variance} units · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(r.status)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Inventory owns investigation and resolution of these reports — check with them for status updates beyond what's shown here.
          </p>
        </Card.Body>
      </Card>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Send Discrepancy to Inventory?"
        message={`This will create a report for ${form.product_id || 'this item'} at ${form.location || 'this location'} (${variance > 0 ? '+' : ''}${variance} units, ${variancePercentage.toFixed(1)}%) and send it to Inventory for investigation. Are you sure?`}
        confirmText="Send Report"
        variant="primary"
        loading={submitting}
      />
    </div>
  )
}
