/**
 * Notifications API client
 */

import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse, Notification } from '@/types'

export interface NotificationFilters {
  type?: 'low_stock' | 'expiry' | 'variance' | 'system' | 'procurement'
  read?: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface CreateNotificationRequest {
  title: string
  message: string
  type: 'low_stock' | 'expiry' | 'variance' | 'system' | 'procurement'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  action_url?: string
  target_roles?: string[]
  target_users?: number[]
  expires_at?: string
}

export interface NotificationStats {
  total_notifications: number
  unread_count: number
  high_priority_count: number
  notifications_by_type: Array<{
    type: string
    count: number
    unread_count: number
  }>
  recent_activity: Array<{
    type: string
    count: number
    last_24h: number
    trend: 'up' | 'down' | 'stable'
  }>
}

export interface BulkActionRequest {
  notification_ids: number[]
  action: 'mark_read' | 'mark_unread' | 'delete'
}

class NotificationsApi {
  // Get notifications for current user
  async getNotifications(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    return apiClient.paginated<Notification>('/notifications', filters)
  }

  // Get single notification
  async getNotification(id: number): Promise<Notification> {
    const response = await apiClient.get<ApiResponse<Notification>>(`/notifications/${id}`)
    return response.data!
  }

  // Mark notification as read
  async markAsRead(id: number): Promise<Notification> {
    const response = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`)
    return response.data!
  }

  // Mark notification as unread
  async markAsUnread(id: number): Promise<Notification> {
    const response = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/unread`)
    return response.data!
  }

  // Delete notification
  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`)
  }

  // Bulk actions
  async bulkAction(request: BulkActionRequest): Promise<{
    processed_count: number
    failed_count: number
    errors?: Array<{
      notification_id: number
      error: string
    }>
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/notifications/bulk-action', request)
    return response.data!
  }

  // Mark all as read
  async markAllAsRead(type?: string): Promise<{
    updated_count: number
  }> {
    const params = type ? { type } : undefined
    const response = await apiClient.patch<ApiResponse<any>>('/notifications/mark-all-read', undefined, { params })
    return response.data!
  }

  // Get notification statistics
  async getStats(): Promise<NotificationStats> {
    const response = await apiClient.get<ApiResponse<NotificationStats>>('/notifications/stats')
    return response.data!
  }

  // Get unread count
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await apiClient.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count')
    return response.data!
  }

  // Create notification (admin only)
  async createNotification(notification: CreateNotificationRequest): Promise<Notification> {
    const response = await apiClient.post<ApiResponse<Notification>>('/notifications', notification)
    return response.data!
  }

  // Send broadcast notification (admin only)
  async broadcastNotification(notification: {
    title: string
    message: string
    type: string
    priority?: string
    target_roles?: string[]
    action_url?: string
  }): Promise<{
    message: string
    notifications_sent: number
    target_users: number
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/notifications/broadcast', notification)
    return response.data!
  }

  // Get notification templates (admin only)
  async getTemplates(): Promise<Array<{
    id: number
    name: string
    title: string
    message: string
    type: string
    priority: string
    variables: string[]
  }>> {
    const response = await apiClient.get<ApiResponse<any>>('/notifications/templates')
    return response.data!
  }

  // Subscribe to real-time notifications via WebSocket
  subscribeToRealTime(callback: (notification: Notification) => void): WebSocket | null {
    if (!window.WebSocket) {
      console.warn('WebSocket not supported')
      return null
    }

    const token = localStorage.getItem('auth_token')
    if (!token) {
      console.warn('No auth token available for WebSocket connection')
      return null
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    const ws = new WebSocket(`${wsUrl}/notifications?token=${token}`)

    ws.onopen = () => {
      console.log('Notification WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data)
        callback(notification)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      if (event.code !== 1000) { // Not a normal closure
        console.warn('Notification WebSocket closed unexpectedly:', event)
        // Attempt to reconnect after a delay
        setTimeout(() => {
          this.subscribeToRealTime(callback)
        }, 5000)
      }
    }

    ws.onerror = (error) => {
      console.error('Notification WebSocket error:', error)
    }

    return ws
  }

  // System health check for notifications
  async checkNotificationHealth(): Promise<{
    service_status: 'healthy' | 'degraded' | 'down'
    pending_notifications: number
    failed_deliveries: number
    average_delivery_time: number
    last_check: string
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/notifications/health')
    return response.data!
  }

  // Get notification preferences for current user
  async getPreferences(): Promise<{
    email_notifications: boolean
    sms_notifications: boolean
    push_notifications: boolean
    notification_types: Record<string, boolean>
    quiet_hours: {
      enabled: boolean
      start_time: string
      end_time: string
    }
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/notifications/preferences')
    return response.data!
  }

  // Update notification preferences
  async updatePreferences(preferences: {
    email_notifications?: boolean
    sms_notifications?: boolean
    push_notifications?: boolean
    notification_types?: Record<string, boolean>
    quiet_hours?: {
      enabled: boolean
      start_time: string
      end_time: string
    }
  }): Promise<{
    message: string
    preferences: any
  }> {
    const response = await apiClient.patch<ApiResponse<any>>('/notifications/preferences', preferences)
    return response.data!
  }
}

// Export singleton instance
export const notificationsApi = new NotificationsApi()

// Export the class for testing
export { NotificationsApi }