/**
 * Inventory API client tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inventoryApi } from '@/shared/api/inventory'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage for auth token
const mockLocalStorage = {
  getItem: vi.fn(() => 'auth-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Inventory API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Products', () => {
    const mockProduct = {
      id: 1,
      name: 'Samsung Galaxy S21',
      sku: 'SAM-GS21-128',
      category: 'Smartphones',
      unit_of_measure: 'pieces',
      current_stock: 50,
      available_stock: 45,
      reorder_point: 10,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    it('gets products list', async () => {
      const mockResponse = {
        success: true,
        data: [mockProduct],
        meta: {
          current_page: 1,
          per_page: 15,
          total: 1,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getProducts()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products?per_page=15',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer auth-token',
          }),
        })
      )
    })

    it('gets products with filters', async () => {
      const filters = {
        search: 'Samsung',
        category: 'Smartphones',
        page: 2,
        per_page: 10,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await inventoryApi.getProducts(filters)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products?per_page=10&search=Samsung&category=Smartphones&page=2',
        expect.any(Object)
      )
    })

    it('gets single product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProduct,
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getProduct(1)

      expect(result).toEqual(mockProduct)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/1',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('creates new product', async () => {
      const newProduct = {
        name: 'iPhone 14 Pro',
        sku: 'APL-IP14P-256',
        category: 'Smartphones',
        unit_of_measure: 'pieces',
        minimum_stock_level: 5,
        maximum_stock_level: 50,
        reorder_point: 8,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, ...newProduct },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.createProduct(newProduct)

      expect(result).toEqual({ id: 2, ...newProduct })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProduct),
        })
      )
    })

    it('updates product', async () => {
      const updates = {
        name: 'Updated Product Name',
        reorder_point: 15,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockProduct, ...updates },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.updateProduct(1, updates)

      expect(result).toEqual({ ...mockProduct, ...updates })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      )
    })

    it('deletes product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Product deleted successfully',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await inventoryApi.deleteProduct(1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('gets low stock products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ ...mockProduct, current_stock: 5 }],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getLowStockProducts()

      expect(result).toEqual([{ ...mockProduct, current_stock: 5 }])
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/low-stock',
        expect.any(Object)
      )
    })
  })

  describe('Batches', () => {
    const mockBatch = {
      id: 1,
      product_id: 1,
      batch_number: 'BT-2024-001',
      quantity_available: 25,
      expiry_date: '2025-12-31',
      status: 'safe',
      created_at: '2024-01-01T00:00:00Z',
    }

    it('gets batches list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockBatch],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getBatches()

      expect(result).toEqual({ success: true, data: [mockBatch] })
    })

    it('gets batches for product', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockBatch],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getProductBatches(1)

      expect(result).toEqual([mockBatch])
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/1/batches',
        expect.any(Object)
      )
    })

    it('gets expiring batches', async () => {
      const expiringBatch = {
        ...mockBatch,
        status: 'warning',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [expiringBatch],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getExpiringBatches(30)

      expect(result).toEqual([expiringBatch])
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/batches/expiring?days=30',
        expect.any(Object)
      )
    })

    it('creates new batch', async () => {
      const newBatch = {
        product_id: 1,
        batch_number: 'BT-2024-002',
        supplier_id: 1,
        quantity_received: 50,
        unit_cost: 199.99,
        expiry_date: '2025-06-30',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, ...newBatch },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.createBatch(newBatch)

      expect(result).toEqual({ id: 2, ...newBatch })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/batches',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newBatch),
        })
      )
    })
  })

  describe('Stock Transactions', () => {
    const mockTransaction = {
      id: 1,
      product_id: 1,
      batch_id: 1,
      type: 'stock_in',
      quantity: 25,
      unit_cost: 199.99,
      total_cost: 4999.75,
      reference_number: 'PO-2024-001',
      user_id: 1,
      created_at: '2024-01-01T00:00:00Z',
    }

    it('gets stock transactions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockTransaction],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getStockTransactions()

      expect(result).toEqual({ success: true, data: [mockTransaction] })
    })

    it('creates stock transaction', async () => {
      const newTransaction = {
        product_id: 1,
        batch_id: 1,
        type: 'stock_out',
        quantity: 10,
        reference_number: 'SO-2024-001',
        notes: 'Sale to customer',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, ...newTransaction },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.createStockTransaction(newTransaction)

      expect(result).toEqual({ id: 2, ...newTransaction })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/stock-transactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newTransaction),
        })
      )
    })

    it('gets product transaction history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockTransaction],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getProductTransactionHistory(1)

      expect(result).toEqual([mockTransaction])
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/products/1/transactions',
        expect.any(Object)
      )
    })
  })

  describe('Physical Counts', () => {
    const mockCount = {
      id: 1,
      product_id: 1,
      batch_id: 1,
      system_quantity: 50,
      counted_quantity: 48,
      variance_quantity: -2,
      variance_percentage: -4.0,
      variance_value: -399.98,
      notes: 'Physical count discrepancy found',
      counted_by: 1,
      counted_at: '2024-01-01T10:00:00Z',
    }

    it('gets physical counts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockCount],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getPhysicalCounts()

      expect(result).toEqual({ success: true, data: [mockCount] })
    })

    it('creates physical count', async () => {
      const newCount = {
        product_id: 1,
        batch_id: 1,
        counted_quantity: 47,
        notes: 'Cycle count - found missing units',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, ...newCount },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.createPhysicalCount(newCount)

      expect(result).toEqual({ id: 2, ...newCount })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/physical-counts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newCount),
        })
      )
    })

    it('gets counts with significant variance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ ...mockCount, variance_percentage: -10.5 }],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await inventoryApi.getCountsWithVariance(5)

      expect(result).toEqual([{ ...mockCount, variance_percentage: -10.5 }])
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/inventory/physical-counts/variance?threshold=5',
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          message: 'Validation failed',
          errors: {
            sku: ['The SKU must be unique'],
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(
        inventoryApi.createProduct({
          name: 'Test',
          sku: 'DUPLICATE',
          category: 'Test',
          unit_of_measure: 'pieces',
        })
      ).rejects.toThrow('Validation failed')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(inventoryApi.getProducts()).rejects.toThrow('Network error')
    })

    it('handles unauthorized access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Unauthorized',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(inventoryApi.getProducts()).rejects.toThrow('Unauthorized')
    })
  })
})