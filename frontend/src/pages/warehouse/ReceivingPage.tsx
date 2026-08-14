/**
 * Receiving Page - Warehouse Staff
 * Lists incoming purchase orders and allows confirming receipt of items
 */

import React, { useState, useEffect } from 'react'
import { PackageCheck, Truck, Clock, CheckCircle } from 'lucide-react'
import { PageHeader, Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/components/common'
import { useNotifications } from '@/hooks/useNotifications'
import type { TableColumn, PurchaseOrder, BatchReceiptData } from '@/types'

interface ReceivingPageData {
  purchaseOrders: PurchaseOrder[]
  loading: boolean
}

export default function ReceivingPage() {
  const [data, setData] = useState<ReceivingPageData>({
    purchaseOrders: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      // Mock data for now - will be replaced with API call
      const mockData: PurchaseOrder[] = [
        {
          id: 1,
          po_number: 'PO-2024-001',
          supplier: { id: 1, name: 'ABC Electronics', contact_person: 'John Doe' },
          total_amount: 15000,
          status: 'approved',
          expected_delivery: '2024-08-15',
          items: [
            { id: 1, product_name: 'Washing Machine WM-100', quantity_ordered: 5, quantity_received: 0, unit_price: 25000 },
            { id: 2, product_name: 'Refrigerator RF-200', quantity_ordered: 3, quantity_received: 0, unit_price: 35000 }
          ],
          created_at: '2024-08-10T10:00:00Z',
          updated_at: '2024-08-10T10:00:00Z'
        },
        {
          id: 2,
          po_number: 'PO-2024-002',
          supplier: { id: 2, name: 'XYZ Supplies', contact_person: 'Jane Smith' },
          total_amount: 8500,
          status: 'shipped',
          expected_delivery: '2024-08-12',
          items: [
            { id: 3, product_name: 'Air Conditioner AC-300', quantity_ordered: 2, quantity_received: 0, unit_price: 42500 }
          ],
          created_at: '2024-08-08T14:30:00Z',
          updated_at: '2024-08-11T09:15:00Z'
        }
      ]

      setTimeout(() => {
        setData({
          purchaseOrders: mockData,
          loading: false
        })
      }, 1000)
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

  const handleConfirmReceipt = async (poId: number) => {
    try {
      // Mock confirmation - will be replaced with API call
      addNotification({
        type: 'success',
        title: 'Receipt Confirmed',
        message: `Purchase order PO-2024-${poId.toString().padStart(3, '0')} marked as received`
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

  const getStatusBadge = (status: string, expectedDelivery: string) => {
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

  const columns: TableColumn<PurchaseOrder>[] = [
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
          <div className="text-sm text-gray-500">{row.supplier.contact_person}</div>
        </div>
      )
    },
    {
      key: 'items',
      label: 'Items',
      render: (_, row) => (
        <div className="text-sm">
          {row.items.length} item{row.items.length > 1 ? 's' : ''}
          <div className="text-gray-500">
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
              className="max-w-md"
            />
          </div>

          <Table
            data={filteredOrders}
            columns={columns}
            emptyMessage="No purchase orders found"
          />
        </Card.Body>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.purchaseOrders.filter(po => po.status === 'shipped').length}
                </p>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.purchaseOrders.filter(po => po.status === 'received').length}
                </p>
                <p className="text-sm font-medium text-gray-600">Received Today</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {data.purchaseOrders.filter(po => {
                    const deliveryDate = new Date(po.expected_delivery)
                    const today = new Date()
                    return deliveryDate < today && po.status !== 'received'
                  }).length}
                </p>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}