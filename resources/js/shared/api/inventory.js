/**
 * Inventory API - Customer Orders, Fulfillment, Damage Reports
 */

import { apiClient } from './client'

export const inventoryApi = {
  // ===== Customer Orders & Picking =====

  /**
   * Get list of customer orders for picking
   * @param {Object} params - Query parameters (status, route, page, per_page, etc.)
   * @returns {Promise<Object>} Customer orders list with picking details
   */
  async getCustomerOrders(params = {}) {
    return apiClient.get('/api/v1/inventory/customer-orders', { params })
  },

  /**
   * Get customer orders ready for picking (pending/reserved)
   * @returns {Promise<Array>} Customer orders with reservation and batch details
   */
  async getPickingList() {
    return apiClient.get('/api/v1/inventory/customer-orders/picking/list')
  },

  /**
   * Get a single customer order by ID
   * @param {number} id - Customer order ID
   * @returns {Promise<Object>} Customer order details
   */
  async getCustomerOrder(id) {
    return apiClient.get(`/api/v1/inventory/customer-orders/${id}`)
  },

  /**
   * Create a new customer order
   * @param {Object} data - Customer order data
   * @returns {Promise<Object>} Created customer order
   */
  async createCustomerOrder(data) {
    return apiClient.post('/api/v1/inventory/customer-orders', data)
  },

  /**
   * Update a customer order
   * @param {number} id - Customer order ID
   * @param {Object} data - Updated customer order data
   * @returns {Promise<Object>} Updated customer order
   */
  async updateCustomerOrder(id, data) {
    return apiClient.put(`/api/v1/inventory/customer-orders/${id}`, data)
  },

  /**
   * Fulfill a customer order (complete picking and issue stock)
   * @param {number} id - Customer order ID
   * @param {Object} data - Fulfillment data
   * @param {string} data.fulfilled_by - User ID who fulfilled the order
   * @param {string} data.notes - Optional notes about fulfillment
   * @returns {Promise<Object>} Updated customer order with stock-out transactions
   */
  async fulfillCustomerOrder(id, data) {
    return apiClient.post(`/api/v1/inventory/customer-orders/${id}/fulfill`, data)
  },

  /**
   * Cancel a customer order
   * @param {number} id - Customer order ID
   * @param {Object} data - Cancellation data {reason}
   * @returns {Promise<Object>} Cancelled customer order
   */
  async cancelCustomerOrder(id, data) {
    return apiClient.post(`/api/v1/inventory/customer-orders/${id}/cancel`, data)
  },

  // ===== Damage Reports =====

  /**
   * Get list of damage reports
   * @param {Object} params - Query parameters (status, page, per_page, etc.)
   * @returns {Promise<Object>} Damage reports list
   */
  async getDamageReports(params = {}) {
    return apiClient.get('/api/v1/inventory/damage-reports', { params })
  },

  /**
   * Get a single damage report by ID
   * @param {number} id - Damage report ID
   * @returns {Promise<Object>} Damage report details
   */
  async getDamageReport(id) {
    return apiClient.get(`/api/v1/inventory/damage-reports/${id}`)
  },

  /**
   * Create a new damage report
   * @param {Object} data - Damage report data
   * @returns {Promise<Object>} Created damage report
   */
  async createDamageReport(data) {
    return apiClient.post('/api/v1/inventory/damage-reports', data)
  },

  /**
   * Update a damage report
   * @param {number} id - Damage report ID
   * @param {Object} data - Updated damage report data
   * @returns {Promise<Object>} Updated damage report
   */
  async updateDamageReport(id, data) {
    return apiClient.put(`/api/v1/inventory/damage-reports/${id}`, data)
  },

  /**
   * Approve a damage report (manager role)
   * Creates stock adjustment to write off damaged inventory
   * @param {number} id - Damage report ID
   * @param {Object} data - Approval data
   * @param {string} data.approved_by - Manager user ID
   * @param {string} data.resolution_notes - Notes about resolution
   * @returns {Promise<Object>} Approved damage report with stock adjustment
   */
  async approveDamageReport(id, data) {
    return apiClient.post(`/api/v1/inventory/damage-reports/${id}/approve`, data)
  },

  /**
   * Reject a damage report (manager role)
   * @param {number} id - Damage report ID
   * @param {Object} data - Rejection data
   * @param {string} data.rejected_by - Manager user ID
   * @param {string} data.rejection_reason - Reason for rejection
   * @returns {Promise<Object>} Rejected damage report
   */
  async rejectDamageReport(id, data) {
    return apiClient.post(`/api/v1/inventory/damage-reports/${id}/reject`, data)
  },

  /**
   * Assign an investigator to a damage report (investigation starts)
   * @param {number} id - Damage report ID
   * @param {Object} data - { investigator_id }
   * @returns {Promise<Object>} Updated damage report
   */
  async assignDamageInvestigator(id, data) {
    return apiClient.post(`/api/v1/inventory/damage-reports/${id}/assign-investigator`, data)
  },

  /**
   * Complete the investigation of a damage report; it then awaits a manager decision
   * @param {number} id - Damage report ID
   * @param {Object} data - { investigation_notes, action_taken? }
   * @returns {Promise<Object>} Updated damage report
   */
  async completeDamageInvestigation(id, data) {
    return apiClient.post(`/api/v1/inventory/damage-reports/${id}/complete-investigation`, data)
  },

  /**
   * Delete a damage report that has not been investigated yet
   * @param {number} id - Damage report ID
   */
  async deleteDamageReport(id) {
    return apiClient.delete(`/api/v1/inventory/damage-reports/${id}`)
  },

  // ===== Discrepancy Reports =====

  /**
   * Get list of discrepancy reports
   * @param {Object} params - Query parameters (status, product_id, page, per_page, ...)
   * @returns {Promise<Object>} Discrepancy reports list
   */
  async getDiscrepancyReports(params = {}) {
    return apiClient.get('/api/v1/inventory/discrepancy-reports', { params })
  },

  /**
   * Raise a discrepancy report
   * @param {Object} data - { product_id, expected_quantity, actual_quantity, discrepancy_type?, location?, notes? }
   * @returns {Promise<Object>} Created discrepancy report
   */
  async createDiscrepancyReport(data) {
    return apiClient.post('/api/v1/inventory/discrepancy-reports', data)
  },

  /**
   * Move a discrepancy report to open / investigating / resolved
   * @param {number} id - Discrepancy report ID
   * @param {Object} data - { status, resolution_notes? }
   * @returns {Promise<Object>} Updated discrepancy report
   */
  async updateDiscrepancyStatus(id, data) {
    return apiClient.patch(`/api/v1/inventory/discrepancy-reports/${id}/status`, data)
  },

  /**
   * Send a discrepancy report to the manager's adjustment approval queue
   * @param {number} id - Discrepancy report ID
   * @returns {Promise<Object>} Updated discrepancy report
   */
  async sendDiscrepancyForApproval(id) {
    return apiClient.post(`/api/v1/inventory/discrepancy-reports/${id}/send-for-approval`)
  },

  // ===== Physical Counts & Variance =====

  /**
   * Get list of physical counts
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Physical counts list
   */
  async getPhysicalCounts(params = {}) {
    return apiClient.get('/api/v1/inventory/physical-counts', { params })
  },

  /**
   * Approve variance adjustment (manager role)
   * @param {number} id - Physical count ID
   * @param {Object} data - Approval data
   * @returns {Promise<Object>} Approved physical count with stock adjustment
   */
  async approveVarianceAdjustment(id, data) {
    return apiClient.post(`/api/v1/inventory/physical-counts/${id}/approve-variance`, data)
  },

  /**
   * Reject variance adjustment (manager role). Stock is left unchanged.
   * @param {number} id - Physical count ID
   * @param {Object} data - Rejection data
   * @param {string} [data.rejection_reason] - Why the adjustment was rejected
   * @returns {Promise<Object>} Rejection result with the updated physical count
   */
  async rejectVarianceAdjustment(id, data) {
    return apiClient.post(`/api/v1/inventory/physical-counts/${id}/reject-variance`, data)
  },

  // ===== Products =====

  /**
   * Get list of products
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Products list
   */
  async getProducts(params = {}) {
    return apiClient.get('/api/v1/inventory/products', { params })
  },

  /**
   * Get a single product by ID
   * @param {number} id - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProduct(id) {
    return apiClient.get(`/api/v1/inventory/products/${id}`)
  },

  /**
   * Create a product (inventory staff). Stock starts at 0 and only changes
   * through stock transactions, so no quantity is accepted here.
   * @param {Object} data - { name, sku, category, unit_price, reorder_level?, is_active? }
   * @returns {Promise<Object>} Created product
   */
  async createProduct(data) {
    return apiClient.post('/api/v1/inventory/products', data)
  },

  /**
   * Update a product's details (inventory staff). Stock quantity is not editable.
   * @param {number} id - Product ID
   * @param {Object} data - Any of { name, sku, category, unit_price, reorder_level, is_active }
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(id, data) {
    return apiClient.put(`/api/v1/inventory/products/${id}`, data)
  },

  /**
   * Delete a product. The backend refuses (409) while it still has stock,
   * active reservations or transaction history.
   * @param {number} id - Product ID
   */
  async deleteProduct(id) {
    return apiClient.delete(`/api/v1/inventory/products/${id}`)
  },

  // ===== Batches & Stock =====

  /**
   * Get list of batches
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Batches list
   */
  async getBatches(params = {}) {
    return apiClient.get('/api/v1/inventory/batches', { params })
  },

  /**
   * Mark a batch expired. The backend writes off the remaining quantity,
   * records the transaction and releases or re-allocates reservations.
   * @param {number} id - Batch ID
   * @returns {Promise<Object>} Updated batch
   */
  async markBatchExpired(id) {
    return apiClient.patch(`/api/v1/inventory/batches/${id}/mark-expired`)
  },

  /**
   * Flag a batch for priority FEFO picking (no stock movement)
   * @param {number} id - Batch ID
   * @returns {Promise<Object>} Updated batch
   */
  async prioritizeBatch(id) {
    return apiClient.patch(`/api/v1/inventory/batches/${id}/prioritize`)
  },

  /**
   * Get stock transactions
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Stock transactions list
   */
  async getStockTransactions(params = {}) {
    return apiClient.get('/api/v1/inventory/stock-transactions', { params })
  },

  /**
   * Record a stock-in (receipt into a new or existing batch)
   * @param {Object} data - { product_id, quantity, unit_cost, batch_id | (create_batch, batch_number,
   *   manufacture_date, expiry_date?), reference_number?, reason?, notes? }
   * @returns {Promise<Object>} { success, message, data: <stock transaction> }
   */
  async stockIn(data) {
    return apiClient.post('/api/v1/inventory/stock-transactions/stock-in', data)
  },

  /**
   * Record a stock-out. Batches are picked FEFO by the backend, so one request
   * can come back as several transactions.
   * @param {Object} data - { product_id, quantity, reference_number?, reason?, notes? }
   * @returns {Promise<Object>} { success, message, data: [<stock transaction>, ...] }
   */
  async stockOut(data) {
    return apiClient.post('/api/v1/inventory/stock-transactions/stock-out', data)
  },

  // ===== Reservations =====

  /**
   * Get reservations list
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Reservations list
   */
  async getReservations(params = {}) {
    return apiClient.get('/api/v1/inventory/reservations', { params })
  },

  /**
   * Cancel a single reservation and release the stock it holds
   * @param {number} id - Reservation ID
   * @returns {Promise<Object>} Cancelled reservation
   */
  async cancelReservation(id) {
    return apiClient.post(`/api/v1/inventory/reservations/${id}/cancel`)
  },

  // ===== FEFO Recommendations =====

  /**
   * Get FEFO (First Expired, First Out) recommendations across all products:
   * one flat row per pickable batch, earliest expiry first.
   * @param {Object} params - Query parameters (product_id?, limit?)
   * @returns {Promise<Object>} { success, data: [...] } FEFO recommendations
   */
  async getFEFORecommendations(params = {}) {
    return apiClient.get('/api/v1/inventory/batches/fefo/recommendations', { params })
  },

  /**
   * Get the FEFO picking order for ONE product and quantity
   * @param {Object} params - { product_id, quantity } (both required)
   * @returns {Promise<Object>} Batch-by-batch picking plan for the product
   */
  async getFEFOPickingOrder(params = {}) {
    return apiClient.get('/api/v1/inventory/batches/fefo/picking-order', { params })
  },
}
