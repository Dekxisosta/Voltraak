/**
 * Procurement API - Purchase Orders and Receiving
 */

import { apiClient } from './client'

export const procurementApi = {
  /**
   * Get list of suppliers (for choosing who a purchase order is placed with)
   * @param {Object} params - Query parameters (status, search, per_page, etc.)
   * @returns {Promise<Object>} Suppliers list
   */
  async getSuppliers(params = {}) {
    return apiClient.get('/api/v1/procurement/suppliers', { params })
  },

  /**
   * Get list of purchase orders
   * @param {Object} params - Query parameters (status, page, per_page, etc.)
   * @returns {Promise<Object>} Purchase orders list with pagination
   */
  async getPurchaseOrders(params = {}) {
    return apiClient.get('/api/v1/procurement/purchase-orders', { params })
  },

  /**
   * Get a single purchase order by ID
   * @param {number} id - Purchase order ID
   * @returns {Promise<Object>} Purchase order details
   */
  async getPurchaseOrder(id) {
    return apiClient.get(`/api/v1/procurement/purchase-orders/${id}`)
  },

  /**
   * Create a new purchase order
   * @param {Object} data - Purchase order data
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(data) {
    return apiClient.post('/api/v1/procurement/purchase-orders', data)
  },

  /**
   * Update a purchase order
   * @param {number} id - Purchase order ID
   * @param {Object} data - Updated purchase order data
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePurchaseOrder(id, data) {
    return apiClient.put(`/api/v1/procurement/purchase-orders/${id}`, data)
  },

  /**
   * Delete a purchase order
   * @param {number} id - Purchase order ID
   * @returns {Promise<void>}
   */
  async deletePurchaseOrder(id) {
    return apiClient.delete(`/api/v1/procurement/purchase-orders/${id}`)
  },

  /**
   * Receive a purchase order (warehouse staff confirms receipt)
   * @param {number} id - Purchase order ID
   * @param {Object} data - Receipt data including items with batches
   * @param {Array} data.items - Items received [{purchase_order_item_id, quantity_received, batches: [{batch_number, expiry_date, manufacture_date, quantity}]}]
   * @param {string} data.received_by - User ID who received the order
   * @param {string} data.notes - Optional notes about the receipt
   * @returns {Promise<Object>} Updated purchase order with inventory stock created
   */
  async receivePurchaseOrder(id, data) {
    return apiClient.post(`/api/v1/procurement/purchase-orders/${id}/receive`, data)
  },

  /**
   * Approve a purchase order
   * @param {number} id - Purchase order ID
   * @returns {Promise<Object>} Approved purchase order
   */
  async approvePurchaseOrder(id) {
    return apiClient.post(`/api/v1/procurement/purchase-orders/${id}/approve`)
  },

  /**
   * Reject a purchase order
   * @param {number} id - Purchase order ID
   * @param {Object} data - Rejection data {reason?: string}
   * @returns {Promise<Object>} Rejected purchase order
   */
  async rejectPurchaseOrder(id, data = {}) {
    return apiClient.post(`/api/v1/procurement/purchase-orders/${id}/reject`, data)
  },
}
