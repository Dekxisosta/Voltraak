/**
 * Reporting API client
 */

import { apiClient } from './client'
import type { ApiResponse, KPIDashboardData } from '@/types'

export interface DashboardKPIData {
  total_skus: number
  total_stock_value: number
  low_stock_count: number
  shrinkage_rate: number
  inventory_accuracy: number
  inventory_turnover: number
  service_level: number
  fefo_compliance: number
  trends: {
    stock_value: Array<{ date: string; value: number }>
    accuracy: Array<{ date: string; value: number }>
    turnover: Array<{ date: string; value: number }>
  }
  category_breakdown: Array<{
    category: string
    value: number
    percentage: number
  }>
  recent_alerts: Array<{
    id: number
    type: 'low_stock' | 'expiry' | 'variance' | 'system'
    message: string
    created_at: string
  }>
}

export interface InventoryReportFilters {
  date_from: string
  date_to: string
  product_id?: number
  category?: string
  include_transactions?: boolean
  include_batches?: boolean
  include_variances?: boolean
}

export interface InventoryReportData {
  summary: {
    total_products: number
    total_batches: number
    total_value: number
    total_transactions: number
    accuracy_rate: number
  }
  products: Array<{
    id: number
    name: string
    sku: string
    category: string
    current_stock: number
    stock_value: number
    transactions_count: number
    last_movement: string
  }>
  movements: Array<{
    product_name: string
    transaction_type: string
    quantity: number
    value: number
    date: string
  }>
  variances: Array<{
    product_name: string
    expected: number
    actual: number
    variance: number
    variance_percentage: number
    date: string
  }>
}

export interface ForecastReportData {
  forecast_period: {
    start_date: string
    end_date: string
    weeks: number
  }
  products: Array<{
    id: number
    name: string
    sku: string
    current_stock: number
    weekly_forecast: Array<{
      week: number
      start_date: string
      predicted_demand: number
      confidence_level: number
    }>
    seasonal_trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal'
    suggested_reorder_quantity: number
    suggested_reorder_date: string
    risk_level: 'low' | 'medium' | 'high'
  }>
  overall_trends: {
    total_predicted_demand: number
    top_growth_products: string[]
    declining_products: string[]
    seasonal_patterns: Array<{
      month: string
      demand_multiplier: number
    }>
  }
}

export interface ProcurementReportData {
  summary: {
    total_orders: number
    total_value: number
    pending_orders: number
    pending_value: number
    average_lead_time: number
    on_time_delivery_rate: number
  }
  orders_by_status: Array<{
    status: string
    count: number
    value: number
  }>
  suppliers: Array<{
    id: number
    name: string
    orders_count: number
    total_value: number
    on_time_rate: number
    quality_rating: number
  }>
  spend_analysis: Array<{
    month: string
    total_spend: number
    orders_count: number
    average_order_value: number
  }>
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'xlsx'
  include_charts?: boolean
  date_range?: {
    from: string
    to: string
  }
}

class ReportingApi {
  // Dashboard KPIs
  async getDashboardKPIs(dateRange?: { from: string; to: string }): Promise<DashboardKPIData> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<DashboardKPIData>>('/dashboard/kpi', { params })
    return response.data!
  }

  // Inventory Reports
  async getInventoryReport(filters: InventoryReportFilters): Promise<InventoryReportData> {
    const response = await apiClient.get<ApiResponse<InventoryReportData>>('/reports/inventory', {
      params: filters
    })
    return response.data!
  }

  async exportInventoryReport(filters: InventoryReportFilters, options: ExportOptions): Promise<Blob> {
    const params = { ...filters, format: options.format }
    const response = await apiClient.get('/reports/inventory/export', {
      params,
      headers: {
        'Accept': options.format === 'pdf' ? 'application/pdf' : 
                 options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                 'text/csv'
      }
    })
    return response as Blob
  }

  // Forecast Reports
  async getForecastReport(weeks: number = 8, productIds?: number[]): Promise<ForecastReportData> {
    const params: any = { weeks }
    if (productIds && productIds.length > 0) {
      params.product_ids = productIds.join(',')
    }
    
    const response = await apiClient.get<ApiResponse<ForecastReportData>>('/reports/forecast', { params })
    return response.data!
  }

  async getProductForecast(productId: number, weeks: number = 8): Promise<{
    product: {
      id: number
      name: string
      sku: string
      current_stock: number
    }
    historical_data: Array<{
      date: string
      demand: number
      stock_level: number
    }>
    forecast: Array<{
      week: number
      start_date: string
      predicted_demand: number
      confidence_level: number
      recommended_stock: number
    }>
    insights: {
      trend: 'increasing' | 'decreasing' | 'stable'
      seasonality: boolean
      recommended_action: string
      risk_assessment: string
    }
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/reports/forecast/product/${productId}`, {
      params: { weeks }
    })
    return response.data!
  }

  // Procurement Reports
  async getProcurementReport(dateRange?: { from: string; to: string }): Promise<ProcurementReportData> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<ProcurementReportData>>('/reports/procurement', { params })
    return response.data!
  }

  async getSupplierReport(supplierId: number, dateRange?: { from: string; to: string }): Promise<{
    supplier: {
      id: number
      name: string
      contact_person: string
    }
    performance: {
      total_orders: number
      total_value: number
      on_time_deliveries: number
      late_deliveries: number
      quality_score: number
      average_lead_time: number
    }
    orders: Array<{
      po_number: string
      order_date: string
      delivery_date: string
      total_amount: number
      status: string
      on_time: boolean
    }>
    trends: Array<{
      month: string
      orders_count: number
      total_value: number
      on_time_rate: number
    }>
  }> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<any>>(`/reports/supplier/${supplierId}`, { params })
    return response.data!
  }

  // Analytics and Insights
  async getABCAnalysis(dateRange?: { from: string; to: string }): Promise<{
    classification: Array<{
      product_id: number
      product_name: string
      sku: string
      category: 'A' | 'B' | 'C'
      annual_usage_value: number
      percentage_of_total: number
      recommended_policy: string
    }>
    summary: {
      a_items: { count: number; value_percentage: number }
      b_items: { count: number; value_percentage: number }
      c_items: { count: number; value_percentage: number }
    }
  }> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<any>>('/reports/abc-analysis', { params })
    return response.data!
  }

  async getInventoryAging(): Promise<{
    aging_buckets: Array<{
      bucket: string
      days_range: string
      products_count: number
      total_value: number
      percentage: number
    }>
    products: Array<{
      id: number
      name: string
      sku: string
      days_in_inventory: number
      current_value: number
      aging_category: string
    }>
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/reports/inventory-aging')
    return response.data!
  }

  async getStockoutAnalysis(dateRange?: { from: string; to: string }): Promise<{
    summary: {
      total_stockouts: number
      lost_sales_value: number
      average_stockout_duration: number
      most_affected_category: string
    }
    stockouts: Array<{
      product_id: number
      product_name: string
      sku: string
      stockout_date: string
      restocked_date: string
      duration_days: number
      estimated_lost_sales: number
    }>
    trends: Array<{
      month: string
      stockouts_count: number
      lost_sales_value: number
    }>
  }> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<any>>('/reports/stockout-analysis', { params })
    return response.data!
  }

  // Custom Reports
  async generateCustomReport(config: {
    report_type: string
    date_range: { from: string; to: string }
    filters: Record<string, any>
    metrics: string[]
    group_by?: string[]
  }): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/reports/custom', config)
    return response.data!
  }

  async getReportTemplates(): Promise<Array<{
    id: number
    name: string
    description: string
    report_type: string
    default_filters: Record<string, any>
    available_metrics: string[]
  }>> {
    const response = await apiClient.get<ApiResponse<any>>('/reports/templates')
    return response.data!
  }
}

// Export singleton instance
export const reportingApi = new ReportingApi()

// Export the class for testing
export { ReportingApi }