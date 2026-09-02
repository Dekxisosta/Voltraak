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
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: inventoryApi } once the endpoint exists
const stockTransactionsSource = createResourceDataSource('inventory/stock-in-out')

const EMPTY_FORM = {
  type: 'stock_in',
  product_id: '',
  quantity: 1,
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

  const { addNotification } = useNotifications()
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
        message: 'Failed to load stock transactions'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const openModal = (type = 'stock_in') => {
    setActiveTab(type)
    setTransactionForm({ ...EMPTY_FORM, type })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleTabChange = (type) => {
    setActiveTab(type)
    setTransactionForm(prev => ({ ...prev, type, reason: '' }))
  }

  const handleSubmitTransaction = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const transactionNumber = `TXN-${transactionForm.type === 'stock_in' ? 'IN' : 'OUT'}-${String(data.transactions.length + 1).padStart(3, '0')}`
      const newTransaction = await stockTransactionsSource.create({
        transaction_number: transactionNumber,
        type: transactionForm.type,
        product_name: 'Sample Product',
        product_sku: 'SAMPLE-SKU',
        quantity: transactionForm.quantity,
        reference_number: transactionForm.reference_number,
        reason: transactionForm.reason,
        batch_number: 'AUTO-BATCH',
        performed_by: 'Current User',
        notes: transactionForm.notes,
        created_at: new Date().toISOString()
      })

      setData(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions]
      }))

      addNotification({
        type: 'success',
        title: 'Transaction Recorded',
        message: `${transactionForm.type === 'stock_in' ? 'Stock In' : 'Stock Out'} transaction ${newTransaction.transaction_number} recorded successfully`
      })

      setModalOpen(false)
      setTransactionForm(EMPTY_FORM)
    } catch (error) {
      console.error('Error submitting transaction:', error)
      addNotification({
        type: 'error',
        title: 'Submission Error',
        message: 'Failed to record stock transaction'
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
    const matchesSearch = txn.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || txn.type === typeFilter
    return matchesSearch && matchesType
  })

  const currentReasons = activeTab === 'stock_in' ? stockInReasons : stockOutReasons

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product / SKU"
                  value={transactionForm.product_id}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, product_id: e.target.value }))}
                  placeholder="Enter product SKU or name"
                  required
                />
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  required
                />
              </div>

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
