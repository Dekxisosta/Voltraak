/**
 * Modal for receiving purchase order items with batch tracking
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/common'
import { cn } from '@/shared/utils'

const emptyBatch = (quantity = 0) => ({
  batch_number: '',
  expiry_date: '',
  manufacture_date: '',
  quantity,
})

/**
 * Build the editable receipt lines for a purchase order. Only items that still
 * have something left to receive are included (the backend rejects
 * over-receiving, and a fully received line cannot take another batch).
 */
const buildReceivedItems = (purchaseOrder) =>
  (purchaseOrder?.items || [])
    .filter(item => (item.quantity_remaining ?? item.quantity_ordered) > 0)
    .map(item => {
      const remaining = item.quantity_remaining ?? item.quantity_ordered
      return {
        purchase_order_item_id: item.id,
        product_name: item.product_name,
        quantity_ordered: item.quantity_ordered,
        quantity_remaining: remaining,
        quantity_received: remaining, // Default to everything still outstanding
        batches: [emptyBatch(remaining)],
      }
    })

export default function ReceiveModal({ isOpen, onClose, purchaseOrder, onConfirm, loading = false }) {
  const [receivedItems, setReceivedItems] = useState(() => buildReceivedItems(purchaseOrder))
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState(null)

  // The modal stays mounted while closed, so the lines must be rebuilt whenever a
  // (different) purchase order is opened - the initial state only sees `null`.
  useEffect(() => {
    if (isOpen && purchaseOrder) {
      setReceivedItems(buildReceivedItems(purchaseOrder))
      setNotes('')
      setFormError(null)
    }
  }, [isOpen, purchaseOrder])

  const updateItem = (itemIndex, updater) => {
    setReceivedItems(prev => prev.map((item, i) => (i === itemIndex ? updater(item) : item)))
  }

  const handleQuantityChange = (itemIndex, value) => {
    const quantity = Math.max(0, parseInt(value) || 0)
    updateItem(itemIndex, item => ({
      ...item,
      quantity_received: quantity,
      // Keep a single batch in step with the received quantity
      batches: item.batches.length === 1
        ? [{ ...item.batches[0], quantity }]
        : item.batches,
    }))
  }

  const handleBatchChange = (itemIndex, batchIndex, field, value) => {
    updateItem(itemIndex, item => ({
      ...item,
      batches: item.batches.map((batch, i) => (i === batchIndex ? { ...batch, [field]: value } : batch)),
    }))
  }

  const addBatch = (itemIndex) => {
    updateItem(itemIndex, item => ({ ...item, batches: [...item.batches, emptyBatch(0)] }))
  }

  const removeBatch = (itemIndex, batchIndex) => {
    updateItem(itemIndex, item => (
      item.batches.length > 1
        ? { ...item, batches: item.batches.filter((_, i) => i !== batchIndex) }
        : item
    ))
  }

  const getTotalBatchQuantity = (item) => {
    return item.batches.reduce((sum, batch) => sum + (parseInt(batch.quantity) || 0), 0)
  }

  const validateForm = () => {
    // Lines left at 0 are skipped (the API requires >= 1 unit per batch)
    const lines = receivedItems.filter(item => item.quantity_received > 0)
    if (lines.length === 0) {
      return 'Enter a received quantity for at least one item'
    }

    for (const item of lines) {
      if (item.quantity_received > item.quantity_remaining) {
        return `${item.product_name}: only ${item.quantity_remaining} unit(s) are still outstanding`
      }

      // Check if quantity received matches batch totals
      const totalBatchQty = getTotalBatchQuantity(item)
      if (totalBatchQty !== item.quantity_received) {
        return `Batch quantities for ${item.product_name} must sum to ${item.quantity_received}`
      }

      // Check if all batches have required fields
      for (const batch of item.batches) {
        if (!String(batch.batch_number).trim() || (parseInt(batch.quantity) || 0) <= 0) {
          return `All batches must have a batch number and quantity > 0`
        }
        if (batch.manufacture_date && batch.expiry_date && batch.expiry_date < batch.manufacture_date) {
          return `Expiry date must not be before the manufacture date (${item.product_name})`
        }
      }
    }
    return null
  }

  const handleSubmit = () => {
    const error = validateForm()
    setFormError(error)
    if (error) return

    // Prepare data for API (matches POST /procurement/purchase-orders/{id}/receive)
    const data = {
      items: receivedItems
        .filter(item => item.quantity_received > 0)
        .map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          quantity_received: item.quantity_received,
          batches: item.batches.map(batch => ({
            batch_number: String(batch.batch_number).trim(),
            quantity: parseInt(batch.quantity),
            expiry_date: batch.expiry_date || null,
            manufacture_date: batch.manufacture_date || null,
          }))
        })),
      notes: notes || null,
    }

    onConfirm(data)
  }

  if (!purchaseOrder) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Receive ${purchaseOrder.po_number}`}>
      <ModalBody>
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-gray-500 mr-2" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {purchaseOrder.supplier?.name || '—'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Expected: {purchaseOrder.expected_delivery ? new Date(purchaseOrder.expected_delivery).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {receivedItems.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Every item on this purchase order has already been received.
            </p>
          )}

          {/* Items */}
          {receivedItems.map((item, itemIndex) => (
            <div key={item.purchase_order_item_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.product_name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ordered: {item.quantity_ordered} units
                    {item.quantity_remaining !== item.quantity_ordered && ` (${item.quantity_remaining} outstanding)`}
                  </p>
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Received now
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity_remaining}
                    value={item.quantity_received}
                    onChange={(e) => handleQuantityChange(itemIndex, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Batches */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Batches
                  </label>
                  <button
                    type="button"
                    onClick={() => addBatch(itemIndex)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Batch
                  </button>
                </div>

                {item.batches.map((batch, batchIndex) => (
                  <div key={batchIndex} className="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Batch {batchIndex + 1}
                      </span>
                      {item.batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatch(itemIndex, batchIndex)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Batch Number *
                        </label>
                        <input
                          type="text"
                          value={batch.batch_number}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'batch_number', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="BATCH001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={batch.quantity}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Mfg Date
                        </label>
                        <input
                          type="date"
                          value={batch.manufacture_date}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'manufacture_date', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={batch.expiry_date}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'expiry_date', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Batch quantity validation */}
                <div className={cn(
                  "text-sm",
                  getTotalBatchQuantity(item) === item.quantity_received
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  Batch total: {getTotalBatchQuantity(item)} / {item.quantity_received}
                </div>
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Any special notes about this receipt..."
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {formError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">{formError}</p>
        )}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || receivedItems.length === 0}>
            {loading ? 'Confirming...' : 'Confirm Receipt'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
