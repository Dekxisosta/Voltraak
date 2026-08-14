/**
 * Inventory API client
 */

import { apiClient } from './client'

class InventoryApi {
  // Products
  async getProducts(filters) {
    return apiClient.paginated('/products', filters)
  }

  async getProduct(id) {
    const response = await apiClient.get(`/products/${id}`)
    return response.data
  }

  async createProduct(product) {
    const response = await apiClient.post('/products', product)
    return response.data
  }

  async updateProduct(id, product) {
    const response = await apiClient.patch(`/products/${id}`, product)
    return response.data
  }

  async deleteProduct(id) {
    await apiClient.delete(`/products/${id}`)
  }

  async getProductStockLevels(id) {
    const response = await apiClient.get(`/products/${id}/stock-levels`)
    return response.data
  }

  // Batches
  async getBatches(filters) {
    return apiClient.paginated('/batches', filters)
  }

  async getBatch(id) {
    const response = await apiClient.get(`/batches/${id}`)
    return response.data
  }

  async createBatch(batch) {
    const response = await apiClient.post('/batches', batch)
    return response.data
  }

  async updateBatch(id, batch) {
    const response = await apiClient.patch(`/batches/${id}`, batch)
    return response.data
  }

  async getExpiryAlerts() {
    const response = await apiClient.get('/expiry-alerts')
    return response.data
  }

  async getFEFORecommendations(productId, route) {
    const params = {}
    if (productId) params.product_id = productId
    if (route) params.route = route
    
    const response = await apiClient.get('/fefo-recommendations', { params })
    return response.data
  }

  // Stock Transactions
  async getStockTransactions(filters) {
    return apiClient.paginated('/stock-transactions', filters)
  }

  async getStockTransaction(id) {
    const response = await apiClient.get(`/stock-transactions/${id}`)
    return response.data
  }

  async stockIn(stockIn) {
    const response = await apiClient.post('/stock-in', stockIn)
    return response.data
  }

  async stockOut(stockOut) {
    const response = await apiClient.post('/stock-out', stockOut)
    return response.data
  }

  async stockTransfer(transfer) {
    const response = await apiClient.post('/stock-transfer', transfer)
    return response.data
  }

  // Physical Counts
  async getPhysicalCounts(filters) {
    return apiClient.paginated('/physical-counts', filters)
  }

  async getPhysicalCount(id) {
    const response = await apiClient.get(`/physical-counts/${id}`)
    return response.data
  }

  async createPhysicalCount(count) {
    const response = await apiClient.post('/physical-counts', count)
    return response.data
  }

  // Discrepancy Reports
  async getDiscrepancyReports(filters) {
    return apiClient.paginated('/discrepancy-reports', filters)
  }

  async getDiscrepancyReport(id) {
    const response = await apiClient.get(`/discrepancy-reports/${id}`)
    return response.data
  }

  async createDiscrepancyReport(report) {
    const response = await apiClient.post('/discrepancy-reports', report)
    return response.data
  }

  async updateDiscrepancyReport(id, update) {
    const response = await apiClient.patch(`/discrepancy-reports/${id}`, update)
    return response.data
  }

  // Damage Reports
  async getDamageReports(filters) {
    return apiClient.paginated('/damage-reports', filters)
  }

  async createDamageReport(report) {
    if (report.photo) {
      const formData = new FormData()
      formData.append('product_id', report.product_id.toString())
      if (report.batch_id) formData.append('batch_id', report.batch_id.toString())
      formData.append('quantity_damaged', report.quantity_damaged.toString())
      formData.append('damage_type', report.damage_type)
      if (report.estimated_value) formData.append('estimated_value', report.estimated_value.toString())
      formData.append('photo', report.photo)
      if (report.notes) formData.append('notes', report.notes)

      const response = await apiClient.upload('/damage-reports', formData)
      return response.data
    } else {
      const response = await apiClient.post('/damage-reports', report)
      return response.data
    }
  }

  // Reservations
  async getReservations(filters) {
    return apiClient.paginated('/reservations', filters)
  }

  async createReservation(reservation) {
    const response = await apiClient.post('/reservations', reservation)
    return response.data
  }

  async updateReservation(id, update) {
    const response = await apiClient.patch(`/reservations/${id}`, update)
    return response.data
  }

  // Customer Orders
  async createCustomerOrder(order) {
    const response = await apiClient.post('/customer-orders', order)
    return response.data
  }

  async getCustomerOrder(id) {
    const response = await apiClient.get(`/customer-orders/${id}`)
    return response.data
  }
}

// Export singleton instance
export const inventoryApi = new InventoryApi()

// Export the class for testing
export { InventoryApi }