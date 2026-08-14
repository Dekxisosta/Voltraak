/**
 * Inventory API client
 */

import { apiClient } from './client'
import type { 
  ApiResponse, 
  PaginatedResponse, 
  Product, 
  Batch, 
  StockTransaction, 
  PhysicalCount, 
  DiscrepancyReport,
  ProductStockLevel,
  BatchRecommendation
} from '@/types'

export interface ProductFilters {
  search?: string
  category?: string
  is_seasonal?: boolean
  low_stock?: boolean
  page?: number
  per_page?: number
}

export interface CreateProductRequest {
  name: string
  sku: string
  description?: string
  category: string
  unit_of_measure: string
  minimum_stock_level: number
  maximum_stock_level: number
  reorder_point: number
  unit_cost?: number
  supplier_id?: number
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface BatchFilters {
  product_id?: number
  status?: string
  expiry_from?: string
  expiry_to?: string
  page?: number
  per_page?: number
}

export interface CreateBatchRequest {
  product_id: number
  supplier_id: number
  batch_number: string
  quantity_received: number
  unit_cost: number
  manufacturing_date?: string
  expiry_date?: string
  received_date: string
  notes?: string
}

export interface UpdateBatchRequest extends Partial<CreateBatchRequest> {}

export interface StockTransactionFilters {
  product_id?: number
  batch_id?: number
  user_id?: number
  type?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface StockInRequest {
  product_id: number
  batch_id?: number
  quantity: number
  unit_cost?: number
  reference_number?: string
  supplier_id?: number
  notes?: string
}

export interface StockOutRequest {
  product_id: number
  quantity: number
  reference_number?: string
  reason: string
  customer_order_id?: number
  notes?: string
}

export interface StockTransferRequest {
  product_id: number
  batch_id?: number
  from_location: string
  to_location: string
  quantity: number
  reference_number?: string
  notes?: string
}

export interface PhysicalCountFilters {
  product_id?: number
  date_from?: string
  date_to?: string
  variance_exceeds_threshold?: number
  page?: number
  per_page?: number
}

export interface CreatePhysicalCountRequest {
  product_id: number
  batch_id?: number
  counted_quantity: number
  notes?: string
}

export interface DiscrepancyFilters {
  status?: 'open' | 'investigating' | 'resolved'
  product_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface CreateDiscrepancyRequest {
  product_id: number
  batch_id?: number
  expected_quantity: number
  actual_quantity: number
  discrepancy_type: string
  location?: string
  notes?: string
}

export interface UpdateDiscrepancyRequest {
  status?: 'open' | 'investigating' | 'resolved'
  investigation_notes?: string
  resolution_notes?: string
}

export interface DamageReportRequest {
  product_id: number
  batch_id?: number
  quantity_damaged: number
  damage_type: string
  estimated_value?: number
  photo?: File
  notes?: string
}

export interface ReservationRequest {
  product_id: number
  customer_order_id: number
  quantity: number
  notes?: string
}

export interface UpdateReservationRequest {
  status?: 'pending' | 'confirmed' | 'released'
  notes?: string
}

class InventoryApi {
  // Products
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    return apiClient.paginated<Product>('/products', filters)
  }

  async getProduct(id: number): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`)
    return response.data!
  }

  async createProduct(product: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>('/products', product)
    return response.data!
  }

  async updateProduct(id: number, product: UpdateProductRequest): Promise<Product> {
    const response = await apiClient.patch<ApiResponse<Product>>(`/products/${id}`, product)
    return response.data!
  }

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`)
  }

  async getProductStockLevels(id: number): Promise<ProductStockLevel> {
    const response = await apiClient.get<ApiResponse<ProductStockLevel>>(`/products/${id}/stock-levels`)
    return response.data!
  }

  // Batches
  async getBatches(filters?: BatchFilters): Promise<PaginatedResponse<Batch>> {
    return apiClient.paginated<Batch>('/batches', filters)
  }

  async getBatch(id: number): Promise<Batch> {
    const response = await apiClient.get<ApiResponse<Batch>>(`/batches/${id}`)
    return response.data!
  }

  async createBatch(batch: CreateBatchRequest): Promise<Batch> {
    const response = await apiClient.post<ApiResponse<Batch>>('/batches', batch)
    return response.data!
  }

  async updateBatch(id: number, batch: UpdateBatchRequest): Promise<Batch> {
    const response = await apiClient.patch<ApiResponse<Batch>>(`/batches/${id}`, batch)
    return response.data!
  }

  async getExpiryAlerts(): Promise<Batch[]> {
    const response = await apiClient.get<ApiResponse<Batch[]>>('/expiry-alerts')
    return response.data!
  }

  async getFEFORecommendations(productId?: number, route?: string): Promise<BatchRecommendation[]> {
    const params: any = {}
    if (productId) params.product_id = productId
    if (route) params.route = route
    
    const response = await apiClient.get<ApiResponse<BatchRecommendation[]>>('/fefo-recommendations', { params })
    return response.data!
  }

  // Stock Transactions
  async getStockTransactions(filters?: StockTransactionFilters): Promise<PaginatedResponse<StockTransaction>> {
    return apiClient.paginated<StockTransaction>('/stock-transactions', filters)
  }

  async getStockTransaction(id: number): Promise<StockTransaction> {
    const response = await apiClient.get<ApiResponse<StockTransaction>>(`/stock-transactions/${id}`)
    return response.data!
  }

  async stockIn(stockIn: StockInRequest): Promise<StockTransaction> {
    const response = await apiClient.post<ApiResponse<StockTransaction>>('/stock-in', stockIn)
    return response.data!
  }

  async stockOut(stockOut: StockOutRequest): Promise<StockTransaction> {
    const response = await apiClient.post<ApiResponse<StockTransaction>>('/stock-out', stockOut)
    return response.data!
  }

  async stockTransfer(transfer: StockTransferRequest): Promise<StockTransaction> {
    const response = await apiClient.post<ApiResponse<StockTransaction>>('/stock-transfer', transfer)
    return response.data!
  }

  // Physical Counts
  async getPhysicalCounts(filters?: PhysicalCountFilters): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.paginated<PhysicalCount>('/physical-counts', filters)
  }

  async getPhysicalCount(id: number): Promise<PhysicalCount> {
    const response = await apiClient.get<ApiResponse<PhysicalCount>>(`/physical-counts/${id}`)
    return response.data!
  }

  async createPhysicalCount(count: CreatePhysicalCountRequest): Promise<PhysicalCount> {
    const response = await apiClient.post<ApiResponse<PhysicalCount>>('/physical-counts', count)
    return response.data!
  }

  // Discrepancy Reports
  async getDiscrepancyReports(filters?: DiscrepancyFilters): Promise<PaginatedResponse<DiscrepancyReport>> {
    return apiClient.paginated<DiscrepancyReport>('/discrepancy-reports', filters)
  }

  async getDiscrepancyReport(id: number): Promise<DiscrepancyReport> {
    const response = await apiClient.get<ApiResponse<DiscrepancyReport>>(`/discrepancy-reports/${id}`)
    return response.data!
  }

  async createDiscrepancyReport(report: CreateDiscrepancyRequest): Promise<DiscrepancyReport> {
    const response = await apiClient.post<ApiResponse<DiscrepancyReport>>('/discrepancy-reports', report)
    return response.data!
  }

  async updateDiscrepancyReport(id: number, update: UpdateDiscrepancyRequest): Promise<DiscrepancyReport> {
    const response = await apiClient.patch<ApiResponse<DiscrepancyReport>>(`/discrepancy-reports/${id}`, update)
    return response.data!
  }

  // Damage Reports
  async getDamageReports(filters?: { page?: number; per_page?: number }): Promise<PaginatedResponse<any>> {
    return apiClient.paginated('/damage-reports', filters)
  }

  async createDamageReport(report: DamageReportRequest): Promise<any> {
    if (report.photo) {
      const formData = new FormData()
      formData.append('product_id', report.product_id.toString())
      if (report.batch_id) formData.append('batch_id', report.batch_id.toString())
      formData.append('quantity_damaged', report.quantity_damaged.toString())
      formData.append('damage_type', report.damage_type)
      if (report.estimated_value) formData.append('estimated_value', report.estimated_value.toString())
      formData.append('photo', report.photo)
      if (report.notes) formData.append('notes', report.notes)

      const response = await apiClient.upload<ApiResponse<any>>('/damage-reports', formData)
      return response.data!
    } else {
      const response = await apiClient.post<ApiResponse<any>>('/damage-reports', report)
      return response.data!
    }
  }

  // Reservations
  async getReservations(filters?: { status?: string; product_id?: number; page?: number; per_page?: number }): Promise<PaginatedResponse<any>> {
    return apiClient.paginated('/reservations', filters)
  }

  async createReservation(reservation: ReservationRequest): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/reservations', reservation)
    return response.data!
  }

  async updateReservation(id: number, update: UpdateReservationRequest): Promise<any> {
    const response = await apiClient.patch<ApiResponse<any>>(`/reservations/${id}`, update)
    return response.data!
  }

  // Customer Orders
  async createCustomerOrder(order: { customer_name: string; customer_email?: string; notes?: string }): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/customer-orders', order)
    return response.data!
  }

  async getCustomerOrder(id: number): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/customer-orders/${id}`)
    return response.data!
  }
}

// Export singleton instance
export const inventoryApi = new InventoryApi()

// Export the class for testing
export { InventoryApi }