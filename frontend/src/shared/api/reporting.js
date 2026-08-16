/**
 * Reporting API client
 */

import { apiClient } from './client'

class ReportingApi {
  // Dashboard KPIs
  async getDashboardKPIs(dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get('/dashboard/kpi', { params })
    return response.data
  }

  // Inventory Reports
  async getInventoryReport(filters) {
    const response = await apiClient.get('/reports/inventory', {
      params: filters
    })
    return response.data
  }

  async exportInventoryReport(filters, options) {
    const params = { ...filters, format: options.format }
    const response = await apiClient.get('/reports/inventory/export', {
      params,
      headers: {
        'Accept': options.format === 'pdf' ? 'application/pdf' : 
                 options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                 'text/csv'
      }
    })
    return response
  }

  // Forecast Reports
  async getForecastReport(weeks = 8, productIds) {
    const params = { weeks }
    if (productIds && productIds.length > 0) {
      params.product_ids = productIds.join(',')
    }
    
    const response = await apiClient.get('/reports/forecast', { params })
    return response.data
  }

  async getProductForecast(productId, weeks = 8) {
    const response = await apiClient.get(`/reports/forecast/product/${productId}`, {
      params: { weeks }
    })
    return response.data
  }

  // Procurement Reports
  async getProcurementReport(dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get('/reports/procurement', { params })
    return response.data
  }

  async getSupplierReport(supplierId, dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get(`/reports/supplier/${supplierId}`, { params })
    return response.data
  }

  // Analytics and Insights
  async getABCAnalysis(dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get('/reports/abc-analysis', { params })
    return response.data
  }

  async getInventoryAging() {
    const response = await apiClient.get('/reports/inventory-aging')
    return response.data
  }

  async getStockoutAnalysis(dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get('/reports/stockout-analysis', { params })
    return response.data
  }

  // Custom Reports
  async generateCustomReport(config) {
    const response = await apiClient.post('/reports/custom', config)
    return response.data
  }

  async getReportTemplates() {
    const response = await apiClient.get('/reports/templates')
    return response.data
  }
}

// Export singleton instance
export const reportingApi = new ReportingApi()

// Export the class for testing
export { ReportingApi }