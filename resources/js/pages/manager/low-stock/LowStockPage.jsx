/**
 * Low Stock Alerts Page - Manager
 * Monitor products at or below reorder points
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, SearchBar, LoadingSpinner, Modal, ModalBody, ModalFooter } from '@/shared/components/common'
import Select from '@/shared/components/common/Select'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData, mutateData, dataSourceMode } from '@/shared/services/dataSource'
import { mockLowStockAlerts } from '@/shared/mocks/manager/low-stock'
import { reportingApi } from '@/shared/api/reporting'
import { procurementApi } from '@/shared/api/procurement'

const toList = (response) => {
  const payload = response?.data ?? response
  const list = payload?.items ?? payload?.data ?? payload
  return Array.isArray(list) ? list : []
}

const toDateInput = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateInDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, Number(days) || 7))
  return toDateInput(d)
}

const firstError = (error, fallback) => {
  const first = error?.errors && Object.values(error.errors).flat().find(Boolean)
  return first || error?.message || fallback
}

export default function LowStockPage() {
  const [data, setData] = useState({ alerts: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()
  const [poTarget, setPoTarget] = useState(null)
  const [poQty, setPoQty] = useState('')
  const [poQtyError, setPoQtyError] = useState('')
  const [creatingPO, setCreatingPO] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [poSupplierId, setPoSupplierId] = useState('')
  const [poUnitCost, setPoUnitCost] = useState('')
  const [poDeliveryDate, setPoDeliveryDate] = useState('')
  const [poErrors, setPoErrors] = useState({})
  const usingApi = dataSourceMode === 'api'

  useEffect(() => {
    loadLowStockAlerts()
  }, [])

  const loadLowStockAlerts = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const response = await fetchData(
        () => mockLowStockAlerts,
        () => reportingApi.getLowStockAlerts()
      )
      // Backend wraps in Laravel envelope { success, data: [...], message, timestamp }
      const alerts = response.data || response
      setData({ alerts: Array.isArray(alerts) ? alerts : [], loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load low stock alerts' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const loadSuppliers = async () => {
    try {
      const list = toList(await procurementApi.getSuppliers({ status: 'active', per_page: 100 }))
      setSuppliers(list.filter(s => s.is_active !== false))
      return list
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: firstError(error, 'Failed to load suppliers') })
      return []
    }
  }

  const openCreatePOModal = async (item) => {
    setPoTarget(item)
    setPoQty(String(item.suggested_order_qty ?? ''))
    setPoQtyError('')
    setPoErrors({})
    setPoSupplierId('')
    setPoUnitCost(item.unit_cost != null ? String(item.unit_cost) : '')
    setPoDeliveryDate(dateInDays(7))
    if (usingApi && suppliers.length === 0) await loadSuppliers()
  }

  const handleSupplierChange = (id) => {
    setPoSupplierId(id)
    setPoErrors(prev => ({ ...prev, supplier: undefined }))
    const supplier = suppliers.find(s => String(s.id) === String(id))
    if (supplier?.default_lead_time_days) setPoDeliveryDate(dateInDays(supplier.default_lead_time_days))
  }

  const closeCreatePOModal = () => {
    if (creatingPO) return
    setPoTarget(null)
  }

  const handleCreatePO = async (e) => {
    e.preventDefault()
    if (!poTarget) return
    const qty = Number(poQty)
    if (!poQty || qty <= 0) {
      setPoQtyError('Enter a valid order quantity')
      return
    }

    if (usingApi) {
      const errors = {}
      if (!poSupplierId) errors.supplier = 'Choose a supplier'
      if (poUnitCost === '' || Number(poUnitCost) < 0) errors.unitCost = 'Enter the unit cost'
      if (!poDeliveryDate || poDeliveryDate <= toDateInput(new Date())) errors.delivery = 'Delivery date must be after today'
      if (Object.keys(errors).length) {
        setPoErrors(errors)
        return
      }
    }

    setCreatingPO(true)
    try {
      // Mock mode keeps the demo behaviour (flag the row locally); API mode
      // creates the purchase order, which lands in PO Approvals as pending.
      const result = await mutateData(
        () => null,
        () => procurementApi.createPurchaseOrder({
          supplier_id: Number(poSupplierId),
          expected_delivery_date: poDeliveryDate,
          notes: `Reorder for low stock: ${poTarget.product_name} (${poTarget.sku})`,
          items: [{
            product_id: poTarget.product_id ?? poTarget.id,
            quantity: qty,
            unit_cost: Number(poUnitCost),
          }],
        })
      )
      const po = result?.data ?? null

      setData(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => a.id === poTarget.id ? { ...a, po_created: true, suggested_order_qty: qty } : a)
      }))
      addNotification(usingApi
        ? { type: 'success', title: 'Purchase Order Created', message: `${po?.po_number || 'Purchase order'} for ${qty} units of ${poTarget.product_name} is pending approval` }
        : { type: 'success', title: 'PO Draft Created', message: `Purchase order for ${qty} units of ${poTarget.product_name} has been drafted` })
      setPoTarget(null)
    } catch (error) {
      if (error?.errors) {
        setPoErrors({
          supplier: error.errors.supplier_id?.[0],
          unitCost: error.errors['items.0.unit_cost']?.[0],
          delivery: error.errors.expected_delivery_date?.[0],
        })
        if (error.errors['items.0.quantity']) setPoQtyError(error.errors['items.0.quantity'][0])
      }
      addNotification({ type: 'error', title: 'Error', message: firstError(error, 'Failed to create purchase order') })
    } finally {
      setCreatingPO(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      out_of_stock: { variant: 'critical', label: 'Out of Stock' },
      critical: { variant: 'critical', label: 'Critical' },
      low: { variant: 'warning', label: 'Low Stock' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current', render: (val, row) => <span className={val <= row.minimum_stock ? 'text-gray-600 dark:text-gray-400 font-bold' : 'font-medium'}>{val}</span> },
    { key: 'reorder_point', label: 'Reorder Point' },
    // days_until_stockout is null when the product has no recent sales to estimate cover from
    { key: 'days_until_stockout', label: 'Days to Stockout', render: (val) => val == null
      ? <span className="text-gray-500 dark:text-gray-400">—</span>
      : <span className={`font-bold ${val === 0 ? 'text-gray-600 dark:text-gray-400' : val <= 7 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{val === 0 ? 'NOW' : `${val} days`}</span> },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'suggested_order_qty', label: 'Suggested Order' },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <Button size="sm" variant="primary" icon={ShoppingCart} disabled={row.po_created || creatingPO} onClick={() => openCreatePOModal(row)}>
        {row.po_created ? 'PO Created' : 'Create PO'}
      </Button>
    )},
  ]

  const filteredAlerts = (data.alerts || []).filter(a =>
    (a.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading low stock alerts..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Low Stock Alerts" subtitle="Products at or below reorder point" icon={AlertTriangle} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.alerts || []).filter(a => a.status === 'out_of_stock').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.alerts || []).filter(a => a.status === 'critical').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Critical</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.alerts || []).filter(a => a.status === 'low').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{(data.alerts || []).reduce((s, a) => s + (a.suggested_order_qty || 0), 0)}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Units to Order</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." className="w-full sm:max-w-md" />
          </div>
          <Table data={filteredAlerts} columns={columns} emptyMessage="No low stock alerts" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      {/* Create PO Modal */}
      <Modal isOpen={Boolean(poTarget)} onClose={closeCreatePOModal} title="Create Purchase Order" size="sm">
        <form onSubmit={handleCreatePO}>
          <ModalBody>
            {poTarget && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{poTarget.product_name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">SKU: {poTarget.sku} · Currently {poTarget.current_stock} in stock</p>
                </div>
                <Input
                  label="Order Quantity"
                  type="number"
                  min="1"
                  required
                  value={poQty}
                  onChange={(e) => { setPoQty(e.target.value); setPoQtyError('') }}
                  error={poQtyError}
                />
                {usingApi && (
                  <>
                    <Select
                      label="Supplier"
                      required
                      value={poSupplierId}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      placeholder="Select a supplier"
                      options={suppliers.map(s => ({ label: s.name, value: String(s.id) }))}
                      error={poErrors.supplier}
                    />
                    <Input
                      label="Unit Cost"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={poUnitCost}
                      onChange={(e) => { setPoUnitCost(e.target.value); setPoErrors(prev => ({ ...prev, unitCost: undefined })) }}
                      error={poErrors.unitCost}
                    />
                    <Input
                      label="Expected Delivery"
                      type="date"
                      required
                      value={poDeliveryDate}
                      onChange={(e) => { setPoDeliveryDate(e.target.value); setPoErrors(prev => ({ ...prev, delivery: undefined })) }}
                      error={poErrors.delivery}
                    />
                  </>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeCreatePOModal} disabled={creatingPO}>Cancel</Button>
              <Button type="submit" variant="primary" loading={creatingPO}>Create PO</Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}