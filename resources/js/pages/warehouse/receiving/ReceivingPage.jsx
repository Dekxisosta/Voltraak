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


export default function ReceivingPage() {
  const [data, setData] = useState({
    purchaseOrders: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
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
        () => null // TODO: procurementApi.getPurchaseOrders()
      )
      
      setData({ purchaseOrders: orders, loading: false })
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load purchase orders'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConfirmReceipt = async (poId) => {
    try {
      // Mock confirmation - will be replaced with API call
      addNotification({
        type: 'success',
        title: 'Receipt Confirmed',
        message: `Purchase order PO-2024-${poId.toString().padStart(3, '0')} marked`
      })

      // Reload data
      loadPurchaseOrders()
    } catch (error) {
      console.error('Error confirming receipt:', error)
      addNotification({
        type: 'error',
        title: 'Confirmation Error',
        message: 'Failed to confirm receipt'
      })
    }
  }

  const getStatusBadge = (status, expectedDelivery) => {
    const deliveryDate = new Date(expectedDelivery)
    const today = new Date()
    const isOverdue = deliveryDate < today && status !== 'received'

    if (status === 'received') {
      return <StatusBadge variant="ok" label="Received" icon={CheckCircle} />
    }
    if (status === 'shipped') {
      return isOverdue 
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
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => getStatusBadge(row.status, row.expected_delivery)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          {row.status === 'shipped' && (
            <Button
              size="sm"
              variant="primary"
              icon={PackageCheck}
              onClick={() => handleConfirmReceipt(row.id)}
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
    po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                  {data.purchaseOrders.filter(po => po.status === 'shipped').length}
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
                  {data.purchaseOrders.filter(po => {
                    const deliveryDate = new Date(po.expected_delivery)
                    const today = new Date()
                    return deliveryDate < today && po.status !== 'received'
                  }).length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}