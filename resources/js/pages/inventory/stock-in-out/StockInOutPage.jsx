/**
 * Stock In/Out Page - Inventory Staff
 * Manage stock movements with transaction logging
 */

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Plus, History, Package } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Select, SearchBar, LoadingSpinner } from '@/shared/components/common'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { useAuth } from '@/shared/contexts/AuthContext'
import { createResourceDataSource, fetchData } from '@/shared/services/dataSource'
import { mockStockLevels } from '@/shared/mocks/inventory/stock-levels'
import { stockTransactionsApi, stockProductsApi, describeError } from '@/shared/api/inventoryMappers'

// In API mode the rows are the backend's stock transactions and recording a
// movement posts to the stock-in / stock-out endpoints (see stockTransactionsApi).
const stockTransactionsSource = createResourceDataSource('inventory/stock-in-out', {
  api: stockTransactionsApi
})

const EMPTY_FORM = {
  type: 'stock_in',
  product_id: '',
  quantity: 1,
  unit_cost: '',
  batch_choice: '',
  batch_number: '',
  manufacture_date: '',
  expiry_date: '',
  reference_number: '',
  reason: '',
  notes: ''
}

const stockInReasons = [
  'Purchase Order Receipt',
  'Return from Customer',
  'Production Completion',
  'Adjustment - Found',
  'Transfer In',
  'Other'
]

const stockOutReasons = [
  'Customer Order',
  'Damage Adjustment',
  'Expiry Disposal',
  'Transfer Out',
  'Sample/Demo',
  'Theft/Loss',
  'Other'
]

// Local calendar date as yyyy-mm-dd (what <input type="date"> works with)
const toDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const todayInput = () => toDateInput(new Date())
const tomorrowInput = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toDateInput(d)
}

// Product list for the form when running on mock data
const mockProductOptions = () =>
  mockStockLevels.map(item => ({
    id: item.id,
    name: item.product_name,
    sku: item.product_sku,
    unit_price: item.current_stock > 0 ? Math.round(item.total_value / item.current_stock) : 0,
    quantity: item.current_stock,
    available_quantity: item.available_stock,
    batches: []
  }))

export default function StockInOutPage() {
  const [data, setData] = useState({
    transactions: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('stock_in')
  const [transactionForm, setTransactionForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Products (with their batches) for the form; loaded the first time the modal opens
  const [products, setProducts] = useState(null)
  const [productsLoading, setProductsLoading] = useState(false)

  const { addNotification } = useNotifications()
  const { user } = useAuth()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await stockTransactionsSource.list()
      setData({ transactions: result, loading: false })
    } catch (error) {
      console.error('Error loading transactions:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: describeError(error, 'Failed to load stock transactions')
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const loadProducts = async () => {
    try {
      setProductsLoading(true)
      const result = await fetchData(mockProductOptions, () => stockProductsApi.list())
      setProducts(result)
    } catch (error) {
      console.error('Error loading products:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: describeError(error, 'Failed to load products')
      })
    } finally {
      setProductsLoading(false)
    }
  }

  const openModal = (type = 'stock_in') => {
    setActiveTab(type)
    setTransactionForm({ ...EMPTY_FORM, type })
    setFormError('')
    setModalOpen(true)
    if (products === null && !productsLoading) loadProducts()
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleTabChange = (type) => {
    setActiveTab(type)
    setFormError('')
    setTransactionForm(prev => ({ ...prev, type, reason: '' }))
  }

  const selectedProduct = (products || []).find(p => String(p.id) === String(transactionForm.product_id)) || null

  const handleProductChange = (productId) => {
    const product = (products || []).find(p => String(p.id) === String(productId))
    setTransactionForm(prev => ({
      ...prev,
      product_id: productId,
      // Receipts default to the product's standard price and its earliest-expiring batch
      unit_cost: product ? product.unit_price : '',
      batch_choice: product ? (product.batches[0] ? String(product.batches[0].id) : 'new') : ''
    }))
  }

  const handleSubmitTransaction = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      const isMock = stockTransactionsSource.isUsingMocks

      // The mock store holds display rows; the API takes the form itself.
      let payload = transactionForm
      if (isMock) {
        const transactionNumber = `TXN-${transactionForm.type === 'stock_in' ? 'IN' : 'OUT'}-${String(data.transactions.length + 1).padStart(3, '0')}`
        payload = {
          transaction_number: transactionNumber,
          type: transactionForm.type,
          product_id: selectedProduct?.id,
          product_name: selectedProduct?.name || 'Unknown Product',
          product_sku: selectedProduct?.sku || '',
          quantity: transactionForm.quantity,
          reference_number: transactionForm.reference_number,
          reason: transactionForm.reason,
          batch_number: transactionForm.batch_choice === 'new' ? transactionForm.batch_number : 'AUTO-BATCH',
          performed_by: user?.name || 'Current User',
          notes: transactionForm.notes,
          created_at: new Date().toISOString()
        }
      }

      const result = await stockTransactionsSource.create(payload)
      const created = [].concat(result)

      setData(prev => ({
        ...prev,
        transactions: [...created.slice().reverse(), ...prev.transactions]
      }))

      const label = transactionForm.type === 'stock_in' ? 'Stock In' : 'Stock Out'
      addNotification({
        type: 'success',
        title: 'Transaction Recorded',
        message: created.length > 1
          ? `${label} recorded across ${created.length} batches (${created.map(t => t.transaction_number).join(', ')})`
          : `${label} transaction ${created[0]?.transaction_number} recorded successfully`
      })

      setModalOpen(false)
      setTransactionForm(EMPTY_FORM)
      // Stock on hand just changed, so the product/batch picker must be re-read
      if (!isMock) setProducts(null)
    } catch (error) {
      console.error('Error submitting transaction:', error)
      const message = describeError(error, 'Failed to record stock transaction')
      setFormError(message)
      addNotification({
        type: 'error',
        title: 'Submission Error',
        message
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'stock_in':
        return <StatusBadge variant="ok" label="Stock In" icon={ArrowUp} />
      case 'stock_out':
        return <StatusBadge variant="warning" label="Stock Out" icon={ArrowDown} />
      default:
        return <StatusBadge variant="neutral" label="Unknown" />
    }
  }

  const columns = [
    {
      key: 'transaction_number',
      label: 'Transaction #',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => getTransactionBadge(value)
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
      key: 'quantity',
      label: 'Quantity',
      render: (value, row) => (
        <div className="font-medium text-gray-600 dark:text-gray-400">
          {row.type === 'stock_in' ? '+' : '-'}{value}
        </div>
      )
    },
    {
      key: 'reference_number',
      label: 'Reference',
    },
    {
      key: 'reason',
      label: 'Reason',
    },
    {
      key: 'performed_by',
      label: 'Performed By',
    },
    {
      key: 'created_at',
      label: 'Date/Time',
      render: (value) => (
        <div>
          <div>{new Date(value).toLocaleDateString()}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    }
  ]

  const typeOptions = ['all', 'stock_in', 'stock_out']
  const filteredTransactions = data.transactions.filter(txn => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (txn.transaction_number || '').toLowerCase().includes(term) ||
                         (txn.product_name || '').toLowerCase().includes(term) ||
                         (txn.product_sku || '').toLowerCase().includes(term) ||
                         (txn.reference_number || '').toLowerCase().includes(term)
    const matchesType = typeFilter === 'all' || txn.type === typeFilter
    return matchesSearch && matchesType
  })

  const currentReasons = activeTab === 'stock_in' ? stockInReasons : stockOutReasons
  const isStockIn = activeTab === 'stock_in'
  const creatingBatch = isStockIn && transactionForm.batch_choice === 'new'

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading stock transactions..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock In/Out"
        subtitle="Record and track inventory movements"
        icon={Package}
      />

      {/* Transaction History */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-medium">Today's Transactions</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" icon={ArrowUp} onClick={() => openModal('stock_in')}>
                Stock In
              </Button>
              <Button variant="warning" size="sm" icon={ArrowDown} onClick={() => openModal('stock_out')}>
                Stock Out
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search transactions..."
              className="flex-1 max-w-md"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input w-full sm:w-auto"
            >
              {typeOptions.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                </option>
              ))}
            </select>
          </div>

          <Table
            data={filteredTransactions}
            columns={columns}
            emptyMessage="No transactions found"
            highlightRowId={highlightRowId}
          />
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <ArrowUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredTransactions.filter(txn => txn.type === 'stock_in').reduce((sum, txn) => sum + txn.quantity, 0)}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Stock In Today ({filteredTransactions.filter(txn => txn.type === 'stock_in').length} transactions)
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <ArrowDown className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredTransactions.filter(txn => txn.type === 'stock_out').reduce((sum, txn) => sum + txn.quantity, 0)}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Stock Out Today ({filteredTransactions.filter(txn => txn.type === 'stock_out').length} transactions)
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredTransactions.length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions Today</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Record Transaction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Record Transaction"
        size="md"
      >
        <form onSubmit={handleSubmitTransaction}>
          <ModalBody>
            {/* Stock In / Stock Out tabs */}
            <div className="flex space-x-2 mb-5 border-b border-[var(--color-glass-border)] pb-4">
              <button
                type="button"
                onClick={() => handleTabChange('stock_in')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'stock_in'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ArrowUp className="h-4 w-4" />
                Stock In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('stock_out')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'stock_out'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                Stock Out
              </button>
            </div>

            <div className="space-y-4">
              {formError && (
                <p className="form-error" role="alert">{formError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Product / SKU"
                  value={transactionForm.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  disabled={productsLoading}
                  helpText={
                    productsLoading
                      ? 'Loading products...'
                      : selectedProduct
                        ? `On hand: ${selectedProduct.quantity} | Available: ${selectedProduct.available_quantity}`
                        : undefined
                  }
                  required
                >
                  <option value="">Select product</option>
                  {(products || []).map(product => (
                    <option key={product.id} value={product.id}>
                      {product.sku ? `${product.sku} - ${product.name}` : product.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  required
                />
              </div>

              {isStockIn && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Unit Cost (₱)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={transactionForm.unit_cost}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                      required
                    />
                    <Select
                      label="Batch"
                      value={transactionForm.batch_choice}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, batch_choice: e.target.value }))}
                      disabled={!selectedProduct}
                      required
                    >
                      <option value="">Select batch</option>
                      {(selectedProduct?.batches || []).map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_number}
                          {batch.expiry_date ? ` - exp ${batch.expiry_date}` : ''} ({batch.quantity} on hand)
                        </option>
                      ))}
                      <option value="new">+ New batch</option>
                    </Select>
                  </div>

                  {creatingBatch && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Batch Number"
                        value={transactionForm.batch_number}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, batch_number: e.target.value }))}
                        placeholder="e.g. BTH-001"
                        required
                      />
                      <Input
                        label="Manufacture Date"
                        type="date"
                        max={todayInput()}
                        value={transactionForm.manufacture_date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, manufacture_date: e.target.value }))}
                        required
                      />
                      <Input
                        label="Expiry Date (Optional)"
                        type="date"
                        min={tomorrowInput()}
                        value={transactionForm.expiry_date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Reference Number"
                  value={transactionForm.reference_number}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="PO number, order number, etc."
                  required
                />
                <Select
                  label="Reason"
                  value={transactionForm.reason}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                >
                  <option value="">Select reason</option>
                  {currentReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input"
                  rows={3}
                  placeholder="Additional details about this transaction..."
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="submit"
                variant={activeTab === 'stock_in' ? 'primary' : 'warning'}
                icon={activeTab === 'stock_in' ? ArrowUp : ArrowDown}
                loading={submitting}
                className="w-full sm:w-auto"
              >
                Record {activeTab === 'stock_in' ? 'Stock In' : 'Stock Out'}
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
