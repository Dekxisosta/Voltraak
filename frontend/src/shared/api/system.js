/**
 * System and Health API client
 */

import { apiClient } from './client'

class SystemApi {
  // Health Check
  async healthCheck() {
    const response = await apiClient.get('/health')
    return response
  }

  // System Statistics
  async getSystemStats() {
    const response = await apiClient.get('/system/stats')
    return response.data
  }

  // Application Information
  async getAppInfo() {
    const response = await apiClient.get('/system/info')
    return response.data
  }

  // System Logs (Admin only)
  async getLogs(filters) {
    const response = await apiClient.get('/system/logs', { params: filters })
    return response.data
  }

  // Configuration (Admin only)
  async getConfig() {
    const response = await apiClient.get('/system/config')
    return response.data
  }

  async updateConfig(config) {
    const response = await apiClient.patch('/system/config', config)
    return response.data
  }

  // Cache Management (Admin only)
  async clearCache(tags) {
    const response = await apiClient.post('/system/cache/clear', { tags })
    return response.data
  }

  async getCacheStats() {
    const response = await apiClient.get('/system/cache/stats')
    return response.data
  }

  // Queue Management (Admin only)
  async getQueueStats() {
    const response = await apiClient.get('/system/queue/stats')
    return response.data
  }

  async retryFailedJobs(queueName) {
    const response = await apiClient.post('/system/queue/retry-failed', {
      queue: queueName
    })
    return response.data
  }

  // Maintenance Mode
  async enableMaintenanceMode(message) {
    const response = await apiClient.post('/system/maintenance/enable', {
      message
    })
    return response.data
  }

  async disableMaintenanceMode() {
    const response = await apiClient.post('/system/maintenance/disable')
    return response.data
  }

  async getMaintenanceStatus() {
    const response = await apiClient.get('/system/maintenance/status')
    return response.data
  }

  // Backup and Recovery (Admin only)
  async createBackup(options) {
    const response = await apiClient.post('/system/backup/create', options)
    return response.data
  }

  async getBackups() {
    const response = await apiClient.get('/system/backup/list')
    return response.data
  }

  async downloadBackup(backupId) {
    return await apiClient.get(`/system/backup/download/${backupId}`)
  }

  // System Updates (Admin only)
  async checkForUpdates() {
    const response = await apiClient.get('/system/updates/check')
    return response.data
  }

  // Performance Monitoring
  async getPerformanceMetrics(timeRange = '24h') {
    const response = await apiClient.get('/system/performance', {
      params: { range: timeRange }
    })
    return response.data
  }
}

// Export singleton instance
export const systemApi = new SystemApi()

// Export the class for testing
export { SystemApi }