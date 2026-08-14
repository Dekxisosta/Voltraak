/**
 * Stock In/Out Page - Inventory Staff
 * Manage stock movements with transaction logging
 */

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Plus, History, Package } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Select, SearchBar, LoadingSpinner } from '@/components/common'
import { PageHeader } from '@/components/layout'
import { useNotifications } from '@/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockStockTransactions } from './mocks'
// TODO: import { inventoryApi } from '@/api'




export default function StockInOutPage() {
  const [data, setData] = useState({
    transactions: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('stock_in')
  const [transactionForm, setTransactionForm] = useState({
    type: 'stock_in',
    product_id: '',
    quantity: 0,
    reference_number: '',
    reason: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    setTransactionForm(prev => ({ ...prev, type: activeTab }))
  }, [activeTab])

  const loadTransactions = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      const result = await fetchData(
        () => mockStockTransactions,
        () => null // TODO: inventoryApi.getStockTransactions()
      )
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

  const handleSubmitTransaction = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Mock submission - will be replaced with API call
      const newTransaction = {
        id: Date.now(),
        transaction_number: `TXN-${transactionForm.type === 'stock_in' ? 'IN' : 'OUT'}-${String(data.transactions.length + 1).padStart(3, '0')}`,
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
      }

      setData(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions]
      }))

      addNotification({
        type: 'success',
        title: 'Transaction Recorded',
        message: `${transactionForm.type === 'stock_in' ? 'Stock In' : 'Stock Out'} transaction ${newTransaction.transaction_number} recorded successfully`
      })

      setTransactionForm({
        type: activeTab,
        product_id: '',
        quantity: 0,
        reference_number: '',
        reason: '',
        notes: ''
      })
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
          <div className="text-sm text-gray-500">{row.product_sku}</div>
        </div>
      )
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (value, row) => (
        <div className={`font-medium ${row.type === 'stock_in' ? 'text-green-600' : 'text-red-600'}`}>
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
          <div className="text-sm text-gray-500">
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

      {/* Transaction Entry Form */}
      <Card>
        <Card.Header>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('stock_in')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
                activeTab === 'stock_in'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ArrowUp className="h-4 w-4" />
              <span>Stock In</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock_out')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
                activeTab === 'stock_out'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ArrowDown className="h-4 w-4" />
              <span>Stock Out</span>
            </button>
          </div>
        </Card.Header>
        <Card.Body>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Product/SKU</label>
                <Input
                  type="text"
                  value={transactionForm.product_id}
                  onChange={(e) => setTransactionForm(prev => ({
                    ...prev,
                    product_id: e.target.value
                  }))}
                  placeholder="Enter product SKU or name"
                  required
                />
              </div>

              <div>
                <label className="form-label">Quantity</label>
                <Input
                  type="number"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm(prev => ({
                    ...prev,
                    quantity: Number(e.target.value)
                  }))}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Reference Number</label>
                <Input
                  type="text"
                  value={transactionForm.reference_number}
                  onChange={(e) => setTransactionForm(prev => ({
                    ...prev,
                    reference_number: e.target.value
                  }))}
                  placeholder="PO number, order number, etc."
                  required
                />
              </div>

              <div>
                <label className="form-label">Reason</label>
                <Select
                  value={transactionForm.reason}
                  onChange={(e) => setTransactionForm(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                  required
                >
                  <option value="">Select reason</option>
                  {currentReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                className="form-input"
                rows={3}
                placeholder="Additional details about this transaction..."
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon={Plus}
              >
                Record {activeTab === 'stock_in' ? 'Stock In' : 'Stock Out'}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      {/* Transaction History */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium">Today's Transactions</h3>
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
          />
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.filter(txn => txn.type === 'stock_in').reduce((sum, txn) => sum + txn.quantity, 0)}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  Stock In Today ({data.transactions.filter(txn => txn.type === 'stock_in').length} transactions)
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.filter(txn => txn.type === 'stock_out').reduce((sum, txn) => sum + txn.quantity, 0)}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  Stock Out Today ({data.transactions.filter(txn => txn.type === 'stock_out').length} transactions)
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.length}
                </p>
                <p className="text-sm font-medium text-gray-600">Total Transactions Today</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}