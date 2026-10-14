/**
 * Receiving Page - Warehouse Staff
 * Lists incoming purchase orders and allows confirming receipt of items
 */

import { useState, useEffect } from 'react'
import { PackageCheck, Truck, Clock, CheckCircle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockPurchaseOrders } from '@/shared/mocks/warehouse/receiving'
import { procurementApi } from '@/shared/api/procurement'
import { unwrapList } from '@/shared/api/inventoryMappers'
import ReceiveModal from './ReceiveModal'

/**
 * Backend purchase order -> the shape this page renders.
 * Backend: { expected_delivery_date, total_amount: "123.00",
 *            items: [{ id, product_name, quantity, received_quantity, remaining_quantity }] }
 * Page:    { expected_delivery, total_amount: number,
 *            items: [{ id, product_name, quantity_ordered, quantity_received, quantity_remaining }] }
 * Mock data already uses the page shape and passes through unchanged.
 */
const normalizePurchaseOrder = (po) => ({
  ...po,
  supplier: po.supplier || { name: '—', contact_person: '' },
  expected_delivery: po.expected_delivery_date ?? po.expected_delivery ?? null,
  total_amount: Number(po.total_amount) || 0,
  items: (po.items || []).map(item => {
    const ordered = Number(item.quantity_ordered ?? item.quantity) || 0
    const received = Number(item.quantity_received ?? item.received_quantity) || 0
    return {
      ...item,
      product_name: item.product_name || item.product?.name || 'Unknown Product',
      quantity_ordered: ordered,
      quantity_received: received,
      quantity_remaining: Math.max(0, Number(item.remaining_quantity ?? (ordered - received)) || 0),
    }
  }),
})

export default function ReceivingPage() {
  const [data, setData] = useState({
    purchaseOrders: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [receiveModal, setReceiveModal] = useState({ isOpen: false, order: null })
  const [submitting, setSubmitting] = useState(false)
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      const orders = await fetchData(
        () => mockPurchaseOrders,
        async () => {
          const response = await procurementApi.getPurchaseOrders({ 
            status: 'sent,approved,received', // Include received for partial re-receipts
            per_page: 100,
          })
          return unwrapList(response).map(normalizePurchaseOrder)
        }
      )
      
      setData({ purchaseOrders: orders, loading: false })
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: error.message || 'Failed to load purchase orders'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConfirmReceipt = async (receiptData) => {
    try {
      setSubmitting(true)
      
      await fetchData(
        () => ({ success: true }), // Mock mode: nothing to persist
        () => procurementApi.receivePurchaseOrder(receiveModal.order.id, receiptData)
      )
      
      addNotification({
        type: 'success',
        title: 'Receipt Confirmed',
        message: `${receiveModal.order.po_number} received and inventory updated`
      })

      setReceiveModal({ isOpen: false, order: null })
      loadPurchaseOrders() // Reload to reflect changes
    } catch (error) {
      console.error('Error confirming receipt:', error)
      addNotification({
        type: 'error',
        title: 'Confirmation Error',
        message: Object.values(error.errors || {}).flat()[0] || error.message || 'Failed to confirm receipt'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openReceiveModal = (order) => {
    setReceiveModal({ isOpen: true, order })
  }

  const isOverdue = (po) =>
    Boolean(po.expected_delivery) && new Date(po.expected_delivery) < new Date() && po.status !== 'received'

  const getStatusBadge = (status, expectedDelivery, order) => {
    const overdue = Boolean(expectedDelivery) && new Date(expectedDelivery) < new Date() && status !== 'received'

    if (status === 'received') {
      // "received" is the backend's partial-receipt status; fully received orders become "completed"
      const outstanding = (order?.items || []).some(item => item.quantity_remaining > 0)
      return <StatusBadge variant="ok" label={outstanding ? 'Partially Received' : 'Received'} icon={CheckCircle} />
    }
    if (status === 'sent') { // Changed from 'shipped' to 'sent' to match backend
      return overdue 
        ? <StatusBadge variant="critical" label="Overdue" icon={Clock} />
        : <StatusBadge variant="warning" label="In Transit" icon={Truck} />
    }
    return <StatusBadge variant="neutral" label="Pending" icon={Clock} />
  }

  const columns = [
    {
      key: 'po_number',
      label: 'PO Number',
      sortable: true,
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.supplier.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.supplier.contact_person}</div>
        </div>
      )
    },
    {
      key: 'items',
      label: 'Items',
      render: (_, row) => (
        <div className="text-sm">
          {row.items.length} item{row.items.length > 1 ? 's' : ''}
          <div className="text-gray-500 dark:text-gray-400">
            Total: ₱{row.total_amount.toLocaleString()}
          </div>
        </div>
      )
    },
    {
      key: 'expected_delivery',
      label: 'Expected Delivery',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '—')
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => getStatusBadge(row.status, row.expected_delivery, row)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          {(row.status === 'sent' || row.status === 'approved' || row.status === 'received') && (
            <Button
              size="sm"
              variant="primary"
              icon={PackageCheck}
              onClick={() => openReceiveModal(row)}
            >
              Confirm Receipt
            </Button>
          )}
        </div>
      )
    }
  ]

  const filteredOrders = data.purchaseOrders.filter(po =>
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (po.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading purchase orders..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving"
        subtitle="Confirm receipt of incoming purchase orders"
        icon={PackageCheck}
      />

      <Card>
        <Card.Body>
          <div className="mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by PO number or supplier..."
              className="w-full sm:max-w-md"
            />
          </div>

          <Table
            data={filteredOrders}
            columns={columns}
            emptyMessage="No purchase orders found"
            highlightRowId={highlightRowId}
          />
        </Card.Body>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Truck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.purchaseOrders.filter(po => po.status === 'sent').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Transit</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.purchaseOrders.filter(po => po.status === 'received').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Received Today</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.purchaseOrders.filter(isOverdue).length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={receiveModal.isOpen}
        onClose={() => setReceiveModal({ isOpen: false, order: null })}
        purchaseOrder={receiveModal.order}
        onConfirm={handleConfirmReceipt}
        loading={submitting}
      />
    </div>
  )
}