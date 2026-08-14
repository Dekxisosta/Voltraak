/**
 * Procurement API client
 */

import { apiClient } from './client'
import type { 
  ApiResponse, 
  PaginatedResponse, 
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem
} from '@/types'

export interface SupplierFilters {
  search?: string
  is_active?: boolean
  page?: number
  per_page?: number
}

export interface CreateSupplierRequest {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  lead_time_days: number
  performance_rating?: number
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export interface PurchaseOrderFilters {
  status?: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'completed' | 'cancelled'
  supplier_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number
  order_date: string
  expected_delivery_date?: string
  notes?: string
  items: Array<{
    product_id: number
    quantity_ordered: number
    unit_cost: number
  }>
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: number
  order_date?: string
  expected_delivery_date?: string
  delivery_date?: string
  notes?: string
  items?: Array<{
    id?: number
    product_id: number
    quantity_ordered: number
    quantity_received?: number
    unit_cost: number
  }>
}

export interface ApprovePurchaseOrderRequest {
  approved_by?: number
  notes?: string
}

export interface RejectPurchaseOrderRequest {
  rejection_reason: string
  notes?: string
}

export interface ReceivePurchaseOrderRequest {
  delivery_date: string
  items: Array<{
    purchase_order_item_id: number
    quantity_received: number
    batch_number?: string
    manufacturing_date?: string
    expiry_date?: string
    notes?: string
  }>
  delivery_notes?: string
}

export interface ReorderPointFilters {
  status?: 'below_minimum' | 'below_reorder' | 'adequate'
  category?: string
  page?: number
  per_page?: number
}

export interface ReorderPointData {
  product_id: number
  product_name: string
  current_stock: number
  minimum_stock: number
  reorder_point: number
  suggested_order_quantity: number
  preferred_supplier_id: number
  estimated_cost: number
  lead_time_days: number
}

export interface ProcurementRequestFilters {
  status?: 'pending' | 'approved' | 'dismissed' | 'converted'
  product_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface ProcurementRequest {
  id: number
  product_id: number
  product_name: string
  current_stock: number
  minimum_stock: number
  reorder_point: number
  suggested_quantity: number
  preferred_supplier_id: number
  estimated_cost: number
  status: 'pending' | 'approved' | 'dismissed' | 'converted'
  created_at: string
  processed_at?: string
  processed_by?: number
  notes?: string
}

export interface UpdateProcurementRequestRequest {
  status: 'approved' | 'dismissed'
  notes?: string
}

class ProcurementApi {
  // Suppliers
  async getSuppliers(filters?: SupplierFilters): Promise<PaginatedResponse<Supplier>> {
    return apiClient.paginated<Supplier>('/suppliers', filters)
  }

  async getSupplier(id: number): Promise<Supplier> {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`)
    return response.data!
  }

  async createSupplier(supplier: CreateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', supplier)
    return response.data!
  }

  async updateSupplier(id: number, supplier: UpdateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, supplier)
    return response.data!
  }

  async deleteSupplier(id: number): Promise<void> {
    await apiClient.delete(`/suppliers/${id}`)
  }

  // Purchase Orders
  async getPurchaseOrders(filters?: PurchaseOrderFilters): Promise<PaginatedResponse<PurchaseOrder>> {
    return apiClient.paginated<PurchaseOrder>('/purchase-orders', filters)
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder> {
    const response = await apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`)
    return response.data!
  }

  async createPurchaseOrder(order: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', order)
    return response.data!
  }

  async updatePurchaseOrder(id: number, order: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, order)
    return response.data!
  }

  async approvePurchaseOrder(id: number, approval: ApprovePurchaseOrderRequest = {}): Promise<PurchaseOrder> {
    const response = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/approve`, approval)
    return response.data!
  }

  async rejectPurchaseOrder(id: number, rejection: RejectPurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/reject`, rejection)
    return response.data!
  }

  async receivePurchaseOrder(id: number, receipt: ReceivePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, receipt)
    return response.data!
  }

  async cancelPurchaseOrder(id: number, reason: string): Promise<PurchaseOrder> {
    const response = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/cancel`, { reason })
    return response.data!
  }

  // Reorder Points
  async getReorderPoints(filters?: ReorderPointFilters): Promise<PaginatedResponse<ReorderPointData>> {
    return apiClient.paginated<ReorderPointData>('/reorder-points', filters)
  }

  async calculateReorderPoint(productId: number): Promise<{
    current_stock: number
    average_daily_usage: number
    lead_time_days: number
    safety_stock: number
    reorder_point: number
    suggested_order_quantity: number
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/reorder-points/calculate/${productId}`)
    return response.data!
  }

  async generateProcurementRequests(): Promise<{
    generated_count: number
    total_estimated_cost: number
    requests: ProcurementRequest[]
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/reorder-points/generate-requests')
    return response.data!
  }

  // Procurement Requests
  async getProcurementRequests(filters?: ProcurementRequestFilters): Promise<PaginatedResponse<ProcurementRequest>> {
    return apiClient.paginated<ProcurementRequest>('/procurement-requests', filters)
  }

  async getProcurementRequest(id: number): Promise<ProcurementRequest> {
    const response = await apiClient.get<ApiResponse<ProcurementRequest>>(`/procurement-requests/${id}`)
    return response.data!
  }

  async updateProcurementRequest(id: number, update: UpdateProcurementRequestRequest): Promise<ProcurementRequest> {
    const response = await apiClient.patch<ApiResponse<ProcurementRequest>>(`/procurement-requests/${id}`, update)
    return response.data!
  }

  async convertToOrderRequests(requestIds: number[]): Promise<{
    purchase_orders_created: number
    total_estimated_cost: number
    created_orders: PurchaseOrder[]
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/procurement-requests/convert-to-orders', {
      request_ids: requestIds
    })
    return response.data!
  }

  async bulkUpdateRequests(updates: Array<{
    id: number
    status: 'approved' | 'dismissed'
    notes?: string
  }>): Promise<{
    updated_count: number
    updated_requests: ProcurementRequest[]
  }> {
    const response = await apiClient.patch<ApiResponse<any>>('/procurement-requests/bulk-update', {
      updates
    })
    return response.data!
  }

  // Vendor Management
  async getSupplierPerformance(supplierId: number, dateRange?: { from: string; to: string }): Promise<{
    supplier: Supplier
    metrics: {
      on_time_delivery_rate: number
      quality_rating: number
      total_orders: number
      total_value: number
      average_lead_time: number
      late_deliveries: number
      rejected_items: number
    }
  }> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<any>>(`/suppliers/${supplierId}/performance`, { params })
    return response.data!
  }

  async getSupplierOrders(supplierId: number, filters?: PurchaseOrderFilters): Promise<PaginatedResponse<PurchaseOrder>> {
    return apiClient.paginated<PurchaseOrder>(`/suppliers/${supplierId}/orders`, filters)
  }
}

// Export singleton instance
export const procurementApi = new ProcurementApi()

// Export the class for testing
export { ProcurementApi }