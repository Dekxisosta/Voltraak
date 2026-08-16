/**
 * Procurement API client
 */

import { apiClient } from './client'

class ProcurementApi {
  // Suppliers
  async getSuppliers(filters) {
    return apiClient.paginated('/suppliers', filters)
  }

  async getSupplier(id) {
    const response = await apiClient.get(`/suppliers/${id}`)
    return response.data
  }

  async createSupplier(supplier) {
    const response = await apiClient.post('/suppliers', supplier)
    return response.data
  }

  async updateSupplier(id, supplier) {
    const response = await apiClient.patch(`/suppliers/${id}`, supplier)
    return response.data
  }

  async deleteSupplier(id) {
    await apiClient.delete(`/suppliers/${id}`)
  }

  // Purchase Orders
  async getPurchaseOrders(filters) {
    return apiClient.paginated('/purchase-orders', filters)
  }

  async getPurchaseOrder(id) {
    const response = await apiClient.get(`/purchase-orders/${id}`)
    return response.data
  }

  async createPurchaseOrder(order) {
    const response = await apiClient.post('/purchase-orders', order)
    return response.data
  }

  async updatePurchaseOrder(id, order) {
    const response = await apiClient.patch(`/purchase-orders/${id}`, order)
    return response.data
  }

  async approvePurchaseOrder(id, approval = {}) {
    const response = await apiClient.patch(`/purchase-orders/${id}/approve`, approval)
    return response.data
  }

  async rejectPurchaseOrder(id, rejection) {
    const response = await apiClient.patch(`/purchase-orders/${id}/reject`, rejection)
    return response.data
  }

  async receivePurchaseOrder(id, receipt) {
    const response = await apiClient.post(`/purchase-orders/${id}/receive`, receipt)
    return response.data
  }

  async cancelPurchaseOrder(id, reason) {
    const response = await apiClient.patch(`/purchase-orders/${id}/cancel`, { reason })
    return response.data
  }

  // Reorder Points
  async getReorderPoints(filters) {
    return apiClient.paginated('/reorder-points', filters)
  }

  async calculateReorderPoint(productId) {
    const response = await apiClient.get(`/reorder-points/calculate/${productId}`)
    return response.data
  }

  async generateProcurementRequests() {
    const response = await apiClient.post('/reorder-points/generate-requests')
    return response.data
  }

  // Procurement Requests
  async getProcurementRequests(filters) {
    return apiClient.paginated('/procurement-requests', filters)
  }

  async getProcurementRequest(id) {
    const response = await apiClient.get(`/procurement-requests/${id}`)
    return response.data
  }

  async updateProcurementRequest(id, update) {
    const response = await apiClient.patch(`/procurement-requests/${id}`, update)
    return response.data
  }

  async convertToOrderRequests(requestIds) {
    const response = await apiClient.post('/procurement-requests/convert-to-orders', {
      request_ids: requestIds
    })
    return response.data
  }

  async bulkUpdateRequests(updates) {
    const response = await apiClient.patch('/procurement-requests/bulk-update', {
      updates
    })
    return response.data
  }

  // Vendor Management
  async getSupplierPerformance(supplierId, dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get(`/suppliers/${supplierId}/performance`, { params })
    return response.data
  }

  async getSupplierOrders(supplierId, filters) {
    return apiClient.paginated(`/suppliers/${supplierId}/orders`, filters)
  }
}

// Export singleton instance
export const procurementApi = new ProcurementApi()

// Export the class for testing
export { ProcurementApi }