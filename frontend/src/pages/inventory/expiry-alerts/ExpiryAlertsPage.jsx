/**
 * Expiry Alerts Page - Inventory Staff
 * Monitor batch expiry dates and manage FEFO compliance
 */

import { useState, useEffect } from 'react'
import { Calendar, Trash2, Flag, Check } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: inventoryApi } once the endpoint exists
const expirySource = createResourceDataSource('inventory/expiry-alerts')

export default function ExpiryAlertsPage() {
  const [data, setData] = useState({ batches: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [writeOffTarget, setWriteOffTarget] = useState(null)
  const [writeOffLoading, setWriteOffLoading] = useState(false)
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadExpiryData()
  }, [])

  const loadExpiryData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await expirySource.list()
      setData({ batches: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load expiry data' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleWriteOff = async () => {
    const batch = writeOffTarget
    setWriteOffLoading(true)
    try {
      await expirySource.update(batch.id, { status: 'written_off' })
      addNotification({ type: 'success', title: 'Batch Written Off', message: `${batch.batch_number} (${batch.quantity} units) has been written off` })
      setWriteOffTarget(null)
      loadExpiryData()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to write off ${batch.batch_number}` })
    } finally {
      setWriteOffLoading(false)
    }
  }

  const handlePrioritize = async (batch) => {
    try {
      await expirySource.update(batch.id, { prioritized: true })
      addNotification({ type: 'success', title: 'Batch Prioritized', message: `${batch.batch_number} flagged for priority FEFO picking` })
      loadExpiryData()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to prioritize ${batch.batch_number}` })
    }
  }

  const getExpiryBadge = (status, days) => {
    if (status === 'written_off') return <StatusBadge variant="neutral" label="Written Off" />
    if (status === 'expired') return <StatusBadge variant="critical" label={`Expired (${Math.abs(days)}d ago)`} />
    if (days <= 30) return <StatusBadge variant="critical" label={`${days} days`} />
    if (days <= 60) return <StatusBadge variant="warning" label={`${days} days`} />
    return <StatusBadge variant="ok" label={`${days} days`} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'batch_number', label: 'Batch #' },
    { key: 'quantity', label: 'Qty Available' },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true },
    { key: 'days_to_expiry', label: 'Days Remaining', render: (val, row) => getExpiryBadge(row.status, val) },
    { key: 'actions', label: 'Actions', render: (_, row) => {
      if (row.status === 'written_off') return <span className="text-xs text-gray-400 dark:text-gray-500">No action</span>
      if (row.status === 'expired') return <Button size="sm" variant="danger" icon={Trash2} onClick={() => setWriteOffTarget(row)}>Write Off</Button>
      if (row.status === 'warning') {
        return row.prioritized
          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"><Check className="h-3.5 w-3.5" /> Prioritized</span>
          : <Button size="sm" variant="warning" icon={Flag} onClick={() => handlePrioritize(row)}>Prioritize</Button>
      }
      return null
    } },
  ]

  const filteredBatches = data.batches
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => b.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()))

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading expiry data..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expiry Alerts" subtitle="Monitor batch expiration and FEFO compliance" icon={Calendar} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{filteredBatches.filter(b => b.status === 'expired').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Expired Batches</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{filteredBatches.filter(b => b.status === 'warning').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon (≤60d)</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{filteredBatches.filter(b => b.status === 'safe').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Safe Batches</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{filteredBatches.reduce((s, b) => s + b.quantity, 0)}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Units Tracked</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products or batches..." className="w-full sm:max-w-md" />
            <div className="flex flex-wrap gap-2">
              {['all', 'expired', 'warning', 'safe'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === s ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table data={filteredBatches} columns={columns} emptyMessage="No batches match your filters" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      <Modal
        isOpen={!!writeOffTarget}
        onClose={() => { if (!writeOffLoading) setWriteOffTarget(null) }}
        title="Write Off Batch"
        size="sm"
      >
        <ModalBody>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {writeOffTarget
              ? `Write off ${writeOffTarget.quantity} units of ${writeOffTarget.product_name} (${writeOffTarget.batch_number})? This marks the expired stock as a loss and cannot be undone.`
              : ''}
          </p>
        </ModalBody>
        <ModalFooter>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={() => setWriteOffTarget(null)} disabled={writeOffLoading} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" variant="danger" icon={Trash2} loading={writeOffLoading} onClick={handleWriteOff} className="w-full sm:w-auto">Write Off</Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  )
}
