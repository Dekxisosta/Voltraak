/**
 * Reporting API - Dashboards, KPIs, Analytics, and Reports
 */

import { apiClient } from './client'

export const reportingApi = {
  // ===== Dashboard Routes =====

  /**
   * Get executive dashboard
   * @returns {Promise<Object>} Executive dashboard data
   */
  async getExecutiveDashboard() {
    return apiClient.get('/api/v1/reporting/dashboard/executive')
  },

  /**
   * Get manager dashboard
   * @returns {Promise<Object>} Manager dashboard data
   */
  async getManagerDashboard() {
    return apiClient.get('/api/v1/reporting/dashboard/manager')
  },

  /**
   * Get staff dashboard
   * @returns {Promise<Object>} Staff dashboard data
   */
  async getStaffDashboard() {
    return apiClient.get('/api/v1/reporting/dashboard/staff')
  },

  /**
   * Get dashboard KPIs
   * @returns {Promise<Object>} KPI dashboard data
   */
  async getKPIDashboard() {
    return apiClient.get('/api/v1/reporting/dashboard/kpis')
  },

  /**
   * Get the manager KPI Dashboard payload (manager/admin only)
   * @param {string} timeframe - '7d' | '30d' | '90d'
   * @returns {Promise<Object>} Envelope whose `data` is
   *   { metrics, changes, trends, categoryBreakdown, alerts, pendingApprovals,
   *     movementSummary, topMovers, criticalStock }
   */
  async getManagerKPIs(timeframe = '30d') {
    return apiClient.get('/api/v1/reporting/dashboard/manager-kpis', {
      params: { timeframe }
    })
  },

  /**
   * Get inventory trends
   * @param {Object} params - Query parameters (timeframe, etc.)
   * @returns {Promise<Object>} Inventory trends data
   */
  async getInventoryTrends(params = {}) {
    return apiClient.get('/api/v1/reporting/dashboard/trends', { params })
  },

  /**
   * Get dashboard alerts
   * @returns {Promise<Array>} Dashboard alerts
   */
  async getDashboardAlerts() {
    return apiClient.get('/api/v1/reporting/dashboard/alerts')
  },

  /**
   * Get accuracy metrics
   * @returns {Promise<Object>} Accuracy metrics
   */
  async getAccuracyMetrics() {
    return apiClient.get('/api/v1/reporting/dashboard/accuracy')
  },

  /**
   * Get performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics() {
    return apiClient.get('/api/v1/reporting/dashboard/performance')
  },

  /**
   * Get ABC analysis
   * @returns {Promise<Object>} ABC analysis data
   */
  async getABCAnalysis() {
    return apiClient.get('/api/v1/reporting/dashboard/abc-analysis')
  },

  /**
   * Export dashboard data
   * @param {Object} data - Export parameters
   * @returns {Promise<Object>} Export result
   */
  async exportDashboard(data) {
    return apiClient.post('/api/v1/reporting/dashboard/export', data)
  },

  // ===== Reports =====

  /**
   * Get inventory summary report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Inventory summary report
   */
  async getInventoryReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/inventory-summary', { params })
  },

  /**
   * Get stock movement report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Stock movement report
   */
  async getStockMovementReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/stock-movement', { params })
  },

  /**
   * Get accuracy report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Accuracy report
   */
  async getAccuracyReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/accuracy', { params })
  },

  /**
   * Get expiry report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Expiry report
   */
  async getExpiryReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/expiry', { params })
  },

  /**
   * Get procurement report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Procurement report
   */
  async getProcurementReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/procurement', { params })
  },

  /**
   * Get ABC analysis report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} ABC analysis report
   */
  async getABCAnalysisReport(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/abc-analysis', { params })
  },

  /**
   * Get low stock alerts (manager only)
   * @returns {Promise<Object>} Envelope whose `data` is an array of
   *   { id, product_name, sku, current_stock, reorder_point, minimum_stock,
   *     avg_daily_sales, days_until_stockout (null = no recent sales), status
   *     ('out_of_stock' | 'critical' | 'low'), suggested_order_qty }
   */
  async getLowStockAlerts() {
    return apiClient.get('/api/v1/reporting/reports/low-stock')
  },

  // ===== Forecasting =====

  /**
   * Get per-product demand forecasts (manager only)
   * @returns {Promise<Object>} Envelope whose `data` is an array of forecast rows
   *   { id, product_name, sku, category, current_stock, avg_weekly_demand,
   *     reorder_point, unit_cost, trend, confidence, ... }
   */
  async getForecasts(params = {}) {
    return apiClient.get('/api/v1/reporting/reports/forecast', { params })
  },

  /**
   * Get combined weekly demand trend: recent actuals plus forecast window (manager only)
   * @param {string} timeframe - Forecast window, e.g. '4w', '8w', '12w'
   * @returns {Promise<Object>} Envelope whose `data` is an array of
   *   { period, actual?, forecast? } points
   */
  async getDemandTrend(timeframe = '8w') {
    return apiClient.get('/api/v1/reporting/reports/demand-trend', {
      params: { timeframe }
    })
  },

  // ===== Exports =====

  /**
   * Export inventory data
   * @param {Object} params - Export parameters
   * @returns {Promise<Blob>} Export file
   */
  async exportInventory(params = {}) {
    return apiClient.get('/api/v1/reporting/exports/inventory', { params })
  },

  /**
   * Export procurement data
   * @param {Object} params - Export parameters
   * @returns {Promise<Blob>} Export file
   */
  async exportProcurement(params = {}) {
    return apiClient.get('/api/v1/reporting/exports/procurement', { params })
  },

  /**
   * Export analytics data
   * @param {Object} params - Export parameters
   * @returns {Promise<Blob>} Export file
   */
  async exportAnalytics(params = {}) {
    return apiClient.get('/api/v1/reporting/exports/analytics', { params })
  },

  // ===== Real-time Data =====

  /**
   * Get real-time metrics
   * @returns {Promise<Object>} Real-time metrics
   */
  async getRealTimeMetrics() {
    return apiClient.get('/api/v1/reporting/realtime/metrics')
  },

  /**
   * Get real-time alerts
   * @returns {Promise<Array>} Real-time alerts
   */
  async getRealTimeAlerts() {
    return apiClient.get('/api/v1/reporting/realtime/alerts')
  }
}