/**
 * Item Update Page - Inventory Staff
 * Update product details, pricing, and categorization
 */

import { useState, useEffect } from 'react'
import { Package, Edit, Search, Save } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/components/common'
import { PageHeader } from '@/components/layout'
import { useNotifications } from '@/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockProducts } from './mocks'
// TODO: import { inventoryApi } from '@/api'

export default function ItemUpdatePage() {
  const [data, setData] = useState({ products: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockProducts,
        () => null // TODO: inventoryApi.getProducts()
      )
      setData({ products: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load products' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleEdit = (id) => {
    setEditingId(id)
    addNotification({ type: 'info', title: 'Edit Mode', message: 'Product editing form would open here' })
  }

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'unit_price', label: 'Unit Price', render: (val) => `₱${val.toLocaleString()}` },
    { key: 'current_stock', label: 'Stock' },
    { key: 'reorder_point', label: 'Reorder Point' },
    { key: 'is_active', label: 'Status', render: (val) => <StatusBadge variant={val ? 'ok' : 'neutral'} label={val ? 'Active' : 'Inactive'} /> },
    { key: 'last_updated', label: 'Last Updated' },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <Button size="sm" variant="secondary" icon={Edit} onClick={() => handleEdit(row.id)}>Edit</Button>
    )},
  ]

  const filteredProducts = data.products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading products..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Item Updates" subtitle="Manage product information and pricing" icon={Package} />

      <Card>
        <Card.Body>
          <div className="flex justify-between items-center mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, SKU, or category..." className="max-w-md" />
          </div>
          <Table data={filteredProducts} columns={columns} emptyMessage="No products found" />
        </Card.Body>
      </Card>
    </div>
  )
}
