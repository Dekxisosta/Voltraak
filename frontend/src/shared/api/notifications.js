/**
 * Notifications API client
 */

import { apiClient } from './client'

class NotificationsApi {
  // Get notifications for current user
  async getNotifications(filters) {
    return apiClient.paginated('/notifications', filters)
  }

  // Get single notification
  async getNotification(id) {
    const response = await apiClient.get(`/notifications/${id}`)
    return response.data
  }

  // Mark notification as read
  async markAsRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`)
    return response.data
  }

  // Mark notification as unread
  async markAsUnread(id) {
    const response = await apiClient.patch(`/notifications/${id}/unread`)
    return response.data
  }

  // Delete notification
  async deleteNotification(id) {
    await apiClient.delete(`/notifications/${id}`)
  }

  // Bulk actions
  async bulkAction(request) {
    const response = await apiClient.post('/notifications/bulk-action', request)
    return response.data
  }

  // Mark all as read
  async markAllAsRead(type) {
    const params = type ? { type } : undefined
    const response = await apiClient.patch('/notifications/mark-all-read', undefined, { params })
    return response.data
  }

  // Get notification statistics
  async getStats() {
    const response = await apiClient.get('/notifications/stats')
    return response.data
  }

  // Get unread count
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count')
    return response.data
  }

  // Create notification (admin only)
  async createNotification(notification) {
    const response = await apiClient.post('/notifications', notification)
    return response.data
  }

  // Send broadcast notification (admin only)
  async broadcastNotification(notification) {
    const response = await apiClient.post('/notifications/broadcast', notification)
    return response.data
  }

  // Get notification templates (admin only)
  async getTemplates() {
    const response = await apiClient.get('/notifications/templates')
    return response.data
  }

  // Subscribe to real-time notifications via WebSocket
  subscribeToRealTime(callback) {
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
  async checkNotificationHealth() {
    const response = await apiClient.get('/notifications/health')
    return response.data
  }

  // Get notification preferences for current user
  async getPreferences() {
    const response = await apiClient.get('/notifications/preferences')
    return response.data
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    const response = await apiClient.patch('/notifications/preferences', preferences)
    return response.data
  }
}

// Export singleton instance
export const notificationsApi = new NotificationsApi()

// Export the class for testing
export { NotificationsApi }