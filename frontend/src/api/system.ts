/**
 * System and Health API client
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types'

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down'
  version: string
  timestamp: string
  services: {
    database: {
      status: 'up' | 'down'
      response_time?: number
    }
    cache: {
      status: 'up' | 'down'
      response_time?: number
    }
    queue: {
      status: 'up' | 'down'
      pending_jobs?: number
    }
    storage: {
      status: 'up' | 'down'
      available_space?: string
    }
  }
  metrics: {
    uptime: number
    memory_usage: number
    cpu_usage: number
    active_connections: number
  }
}

export interface SystemStatsResponse {
  users: {
    total: number
    active_today: number
    active_this_month: number
  }
  inventory: {
    total_products: number
    total_batches: number
    low_stock_count: number
    expired_count: number
  }
  transactions: {
    today: number
    this_week: number
    this_month: number
  }
  system: {
    version: string
    environment: string
    uptime: string
    last_backup: string
  }
}

export interface LogEntry {
  id: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  message: string
  context: Record<string, any>
  timestamp: string
  user_id?: number
  ip_address?: string
  module?: string
}

export interface LogFilters {
  level?: string
  module?: string
  user_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

class SystemApi {
  // Health Check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await apiClient.get<HealthCheckResponse>('/health')
    return response
  }

  // System Statistics
  async getSystemStats(): Promise<SystemStatsResponse> {
    const response = await apiClient.get<ApiResponse<SystemStatsResponse>>('/system/stats')
    return response.data!
  }

  // Application Information
  async getAppInfo(): Promise<{
    name: string
    version: string
    environment: string
    debug_mode: boolean
    maintenance_mode: boolean
    features: Record<string, boolean>
    build_info: {
      commit_hash?: string
      build_date?: string
      branch?: string
    }
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/info')
    return response.data!
  }

  // System Logs (Admin only)
  async getLogs(filters?: LogFilters): Promise<{
    data: LogEntry[]
    meta: {
      current_page: number
      total: number
      per_page: number
    }
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/logs', { params: filters })
    return response.data!
  }

  // Configuration (Admin only)
  async getConfig(): Promise<Record<string, any>> {
    const response = await apiClient.get<ApiResponse<Record<string, any>>>('/system/config')
    return response.data!
  }

  async updateConfig(config: Record<string, any>): Promise<{
    message: string
    updated_keys: string[]
  }> {
    const response = await apiClient.patch<ApiResponse<any>>('/system/config', config)
    return response.data!
  }

  // Cache Management (Admin only)
  async clearCache(tags?: string[]): Promise<{
    message: string
    cleared_tags: string[]
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/system/cache/clear', { tags })
    return response.data!
  }

  async getCacheStats(): Promise<{
    total_keys: number
    memory_usage: string
    hit_rate: number
    miss_rate: number
    tags: Array<{
      name: string
      key_count: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/cache/stats')
    return response.data!
  }

  // Queue Management (Admin only)
  async getQueueStats(): Promise<{
    queues: Array<{
      name: string
      pending: number
      processing: number
      failed: number
    }>
    workers: Array<{
      name: string
      status: 'active' | 'paused' | 'stopped'
      memory_usage: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/queue/stats')
    return response.data!
  }

  async retryFailedJobs(queueName?: string): Promise<{
    message: string
    retried_count: number
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/system/queue/retry-failed', {
      queue: queueName
    })
    return response.data!
  }

  // Maintenance Mode
  async enableMaintenanceMode(message?: string): Promise<{
    message: string
    maintenance_enabled: boolean
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/system/maintenance/enable', {
      message
    })
    return response.data!
  }

  async disableMaintenanceMode(): Promise<{
    message: string
    maintenance_disabled: boolean
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/system/maintenance/disable')
    return response.data!
  }

  async getMaintenanceStatus(): Promise<{
    enabled: boolean
    message?: string
    enabled_at?: string
    enabled_by?: string
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/maintenance/status')
    return response.data!
  }

  // Backup and Recovery (Admin only)
  async createBackup(options: {
    include_database?: boolean
    include_files?: boolean
    compress?: boolean
  }): Promise<{
    message: string
    backup_id: string
    estimated_time: string
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/system/backup/create', options)
    return response.data!
  }

  async getBackups(): Promise<Array<{
    id: string
    name: string
    size: string
    created_at: string
    type: string
    status: 'completed' | 'in_progress' | 'failed'
  }>> {
    const response = await apiClient.get<ApiResponse<any>>('/system/backup/list')
    return response.data!
  }

  async downloadBackup(backupId: string): Promise<Blob> {
    return await apiClient.get(`/system/backup/download/${backupId}`)
  }

  // System Updates (Admin only)
  async checkForUpdates(): Promise<{
    current_version: string
    latest_version: string
    update_available: boolean
    release_notes?: string
    security_update: boolean
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/updates/check')
    return response.data!
  }

  // Performance Monitoring
  async getPerformanceMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    response_times: Array<{
      timestamp: string
      average_ms: number
      p95_ms: number
      p99_ms: number
    }>
    throughput: Array<{
      timestamp: string
      requests_per_minute: number
    }>
    errors: Array<{
      timestamp: string
      error_rate: number
    }>
    resources: Array<{
      timestamp: string
      cpu_percent: number
      memory_percent: number
      disk_percent: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/system/performance', {
      params: { range: timeRange }
    })
    return response.data!
  }
}

// Export singleton instance
export const systemApi = new SystemApi()

// Export the class for testing
export { SystemApi }