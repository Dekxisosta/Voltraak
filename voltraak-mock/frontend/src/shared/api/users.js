/**
 * User Management API client
 */

import { apiClient } from './client'

class UsersApi {
  // User CRUD Operations
  async getUsers(filters) {
    return apiClient.paginated('/users', filters)
  }

  async getUser(id) {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  }

  async createUser(user) {
    const response = await apiClient.post('/users', user)
    return response.data
  }

  async updateUser(id, user) {
    const response = await apiClient.patch(`/users/${id}`, user)
    return response.data
  }

  async deleteUser(id) {
    await apiClient.delete(`/users/${id}`)
  }

  async activateUser(id) {
    const response = await apiClient.patch(`/users/${id}/activate`)
    return response.data
  }

  async deactivateUser(id, reason) {
    const response = await apiClient.patch(`/users/${id}/deactivate`, { reason })
    return response.data
  }

  // Bulk Operations
  async bulkUpdateUsers(request) {
    const response = await apiClient.patch('/users/bulk-update', request)
    return response.data
  }

  async bulkDeactivateUsers(userIds, reason) {
    const response = await apiClient.patch('/users/bulk-deactivate', {
      user_ids: userIds,
      reason
    })
    return response.data
  }

  // User Statistics and Analytics
  async getUserStats(dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get('/users/stats', { params })
    return response.data
  }

  async getUserActivity(id, dateRange) {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get(`/users/${id}/activity`, { params })
    return response.data
  }

  async getUserPerformance(id, period = '30d') {
    const response = await apiClient.get(`/users/${id}/performance`, {
      params: { period }
    })
    return response.data
  }

  // Password and Security Management
  async resetUserPassword(id, request) {
    const response = await apiClient.patch(`/users/${id}/reset-password`, request)
    return response.data
  }

  async forcePasswordChange(id) {
    const response = await apiClient.patch(`/users/${id}/force-password-change`)
    return response.data
  }

  async unlockUser(id) {
    const response = await apiClient.patch(`/users/${id}/unlock`)
    return response.data
  }

  async getUserSessions(id) {
    const response = await apiClient.get(`/users/${id}/sessions`)
    return response.data
  }

  async terminateUserSession(id, sessionId) {
    const response = await apiClient.delete(`/users/${id}/sessions/${sessionId}`)
    return response.data
  }

  // Notification and Preferences
  async getUserNotificationSettings(id) {
    const response = await apiClient.get(`/users/${id}/notification-settings`)
    return response.data
  }

  async updateUserNotificationSettings(id, settings) {
    const response = await apiClient.patch(`/users/${id}/notification-settings`, settings)
    return response.data
  }

  async sendUserNotification(id, notification) {
    const response = await apiClient.post(`/users/${id}/notify`, notification)
    return response.data
  }

  // Role and Permission Management
  async getUserPermissions(id) {
    const response = await apiClient.get(`/users/${id}/permissions`)
    return response.data
  }

  async updateUserRole(id, role, reason) {
    const response = await apiClient.patch(`/users/${id}/role`, { role, reason })
    return response.data
  }

  async getAvailableRoles() {
    const response = await apiClient.get('/users/roles')
    return response.data
  }

  async getDepartments() {
    const response = await apiClient.get('/users/departments')
    return response.data
  }

  // Import/Export
  async exportUsers(filters) {
    const response = await apiClient.get('/users/export', {
      params: filters,
      headers: {
        'Accept': 'text/csv'
      }
    })
    return response
  }

  async importUsers(file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.upload('/users/import', formData)
    return response.data
  }
}

// Export singleton instance
export const usersApi = new UsersApi()

// Export the class for testing
export { UsersApi }