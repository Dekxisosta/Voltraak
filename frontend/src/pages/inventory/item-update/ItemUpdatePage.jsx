/**
 * Item Update Page - Inventory Staff
 * Update product details, pricing, and categorization
 */

import { useState, useEffect } from 'react'
import { Package, Edit, Plus, Trash2 } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Select, SearchBar, LoadingSpinner, Modal, ModalBody, ModalFooter, ConfirmModal } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockProducts } from '@/shared/mocks/inventory/item-update'
// TODO: import { inventoryApi } from '@/api'

const emptyForm = { name: '', sku: '', category: '', unit_price: '', current_stock: '', reorder_point: '', is_active: true }

export default function ItemUpdatePage() {
  const [data, setData] = useState({ products: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const openAddModal = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit_price: String(product.unit_price),
      current_stock: String(product.current_stock),
      reorder_point: String(product.reorder_point),
      is_active: product.is_active,
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setFormOpen(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Product name is required'
    if (!form.sku.trim()) {
      errors.sku = 'SKU is required'
    } else {
      const duplicate = data.products.find(
        p => p.sku.toLowerCase() === form.sku.trim().toLowerCase() && p.id !== editingProduct?.id
      )
      if (duplicate) errors.sku = 'A product with this SKU already exists'
    }
    if (!form.category.trim()) errors.category = 'Category is required'
    if (form.unit_price === '' || Number(form.unit_price) < 0) errors.unit_price = 'Enter a valid price'
    if (form.current_stock === '' || Number(form.current_stock) < 0) errors.current_stock = 'Enter a valid stock quantity'
    if (form.reorder_point === '' || Number(form.reorder_point) < 0) errors.reorder_point = 'Enter a valid reorder point'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category.trim(),
        unit_price: Number(form.unit_price),
        current_stock: Number(form.current_stock),
        reorder_point: Number(form.reorder_point),
        is_active: form.is_active,
        last_updated: new Date().toISOString().slice(0, 10),
      }

      if (editingProduct) {
        setData(prev => ({
          ...prev,
          products: prev.products.map(p => p.id === editingProduct.id
            ? { ...p, ...payload, available_stock: payload.current_stock }
            : p)
        }))
        addNotification({ type: 'success', title: 'Product Updated', message: `${payload.name} has been updated` })
      } else {
        const newProduct = {
          id: Math.max(0, ...data.products.map(p => p.id)) + 1,
          ...payload,
          available_stock: payload.current_stock,
        }
        setData(prev => ({ ...prev, products: [newProduct, ...prev.products] }))
        addNotification({ type: 'success', title: 'Product Added', message: `${payload.name} has been added` })
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== deleteTarget.id) }))
      addNotification({ type: 'success', title: 'Product Removed', message: `${deleteTarget.name} has been removed` })
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
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
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>Edit</Button>
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(row)}>Delete</Button>
      </div>
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, SKU, or category..." className="w-full sm:max-w-md" />
            <Button variant="primary" icon={Plus} onClick={openAddModal} className="w-full sm:w-auto">Add Product</Button>
          </div>
          <Table data={filteredProducts} columns={columns} emptyMessage="No products found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal isOpen={formOpen} onClose={closeFormModal} title={editingProduct ? 'Edit Product' : 'Add Product'} size="md">
        <form onSubmit={handleSubmitForm}>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Product Name"
                required
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                error={formErrors.name}
                placeholder="Samsung Refrigerator 21cu"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  required
                  value={form.sku}
                  onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                  error={formErrors.sku}
                  placeholder="SAMSUNG-RF21"
                />
                <Input
                  label="Category"
                  required
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  error={formErrors.category}
                  placeholder="Refrigerators"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Unit Price (₱)"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.unit_price}
                  onChange={(e) => setForm(prev => ({ ...prev, unit_price: e.target.value }))}
                  error={formErrors.unit_price}
                />
                <Input
                  label="Current Stock"
                  type="number"
                  min="0"
                  required
                  value={form.current_stock}
                  onChange={(e) => setForm(prev => ({ ...prev, current_stock: e.target.value }))}
                  error={formErrors.current_stock}
                />
                <Input
                  label="Reorder Point"
                  type="number"
                  min="0"
                  required
                  value={form.reorder_point}
                  onChange={(e) => setForm(prev => ({ ...prev, reorder_point: e.target.value }))}
                  error={formErrors.reorder_point}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeFormModal} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>{editingProduct ? 'Save Changes' : 'Add Product'}</Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Product"
        message={deleteTarget ? `Are you sure you want to remove ${deleteTarget.name} (${deleteTarget.sku})? This cannot be undone.` : ''}
        confirmText="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
