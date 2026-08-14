/**
 * User Management API client
 */

import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse, User } from '@/types'

export interface UserFilters {
  search?: string
  role?: string
  is_active?: boolean
  department?: string
  page?: number
  per_page?: number
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: string
  phone?: string
  department?: string
  is_active?: boolean
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: string
  phone?: string
  department?: string
  is_active?: boolean
}

export interface BulkUpdateUsersRequest {
  user_ids: number[]
  updates: {
    role?: string
    is_active?: boolean
    department?: string
  }
}

export interface UserStatsData {
  total_users: number
  active_users: number
  users_by_role: Array<{
    role: string
    count: number
  }>
  users_by_department: Array<{
    department: string
    count: number
  }>
  recent_activity: Array<{
    user_id: number
    user_name: string
    action: string
    timestamp: string
  }>
  login_stats: {
    daily_logins: Array<{
      date: string
      login_count: number
      unique_users: number
    }>
    top_active_users: Array<{
      user_id: number
      user_name: string
      login_count: number
      last_login: string
    }>
  }
}

export interface UserActivityData {
  user: User
  activity_summary: {
    total_actions: number
    last_30_days: number
    most_active_day: string
    primary_activities: string[]
  }
  recent_activities: Array<{
    id: number
    action: string
    description: string
    ip_address: string
    user_agent: string
    created_at: string
  }>
  login_history: Array<{
    id: number
    login_time: string
    logout_time?: string
    ip_address: string
    location?: string
    device?: string
  }>
  performance_metrics: {
    transactions_completed: number
    accuracy_rate: number
    average_session_duration: number
    modules_accessed: string[]
  }
}

export interface ResetUserPasswordRequest {
  new_password: string
  password_confirmation: string
  force_change?: boolean
  notify_user?: boolean
}

export interface UserNotificationSettings {
  email_notifications: boolean
  sms_notifications: boolean
  low_stock_alerts: boolean
  expiry_alerts: boolean
  variance_alerts: boolean
  system_notifications: boolean
}

class UsersApi {
  // User CRUD Operations
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    return apiClient.paginated<User>('/users', filters)
  }

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
    return response.data!
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', user)
    return response.data!
  }

  async updateUser(id: number, user: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, user)
    return response.data!
  }

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`)
  }

  async activateUser(id: number): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`)
    return response.data!
  }

  async deactivateUser(id: number, reason?: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`, { reason })
    return response.data!
  }

  // Bulk Operations
  async bulkUpdateUsers(request: BulkUpdateUsersRequest): Promise<{
    updated_count: number
    updated_users: User[]
    failed_updates: Array<{
      user_id: number
      error: string
    }>
  }> {
    const response = await apiClient.patch<ApiResponse<any>>('/users/bulk-update', request)
    return response.data!
  }

  async bulkDeactivateUsers(userIds: number[], reason?: string): Promise<{
    deactivated_count: number
    failed_count: number
  }> {
    const response = await apiClient.patch<ApiResponse<any>>('/users/bulk-deactivate', {
      user_ids: userIds,
      reason
    })
    return response.data!
  }

  // User Statistics and Analytics
  async getUserStats(dateRange?: { from: string; to: string }): Promise<UserStatsData> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<UserStatsData>>('/users/stats', { params })
    return response.data!
  }

  async getUserActivity(id: number, dateRange?: { from: string; to: string }): Promise<UserActivityData> {
    const params = dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined
    const response = await apiClient.get<ApiResponse<UserActivityData>>(`/users/${id}/activity`, { params })
    return response.data!
  }

  async getUserPerformance(id: number, period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
    user: User
    period: string
    metrics: {
      total_transactions: number
      accuracy_rate: number
      productivity_score: number
      error_rate: number
      average_response_time: number
    }
    comparisons: {
      vs_previous_period: number
      vs_department_average: number
      vs_role_average: number
    }
    trends: Array<{
      date: string
      transactions: number
      accuracy: number
      response_time: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/users/${id}/performance`, {
      params: { period }
    })
    return response.data!
  }

  // Password and Security Management
  async resetUserPassword(id: number, request: ResetUserPasswordRequest): Promise<{
    message: string
    password_changed: boolean
    notification_sent: boolean
  }> {
    const response = await apiClient.patch<ApiResponse<any>>(`/users/${id}/reset-password`, request)
    return response.data!
  }

  async forcePasswordChange(id: number): Promise<{
    message: string
    force_change_enabled: boolean
  }> {
    const response = await apiClient.patch<ApiResponse<any>>(`/users/${id}/force-password-change`)
    return response.data!
  }

  async unlockUser(id: number): Promise<{
    message: string
    account_unlocked: boolean
  }> {
    const response = await apiClient.patch<ApiResponse<any>>(`/users/${id}/unlock`)
    return response.data!
  }

  async getUserSessions(id: number): Promise<Array<{
    id: string
    ip_address: string
    location?: string
    device?: string
    last_activity: string
    is_current: boolean
  }>> {
    const response = await apiClient.get<ApiResponse<any>>(`/users/${id}/sessions`)
    return response.data!
  }

  async terminateUserSession(id: number, sessionId: string): Promise<{
    message: string
    session_terminated: boolean
  }> {
    const response = await apiClient.delete<ApiResponse<any>>(`/users/${id}/sessions/${sessionId}`)
    return response.data!
  }

  // Notification and Preferences
  async getUserNotificationSettings(id: number): Promise<UserNotificationSettings> {
    const response = await apiClient.get<ApiResponse<UserNotificationSettings>>(`/users/${id}/notification-settings`)
    return response.data!
  }

  async updateUserNotificationSettings(id: number, settings: Partial<UserNotificationSettings>): Promise<UserNotificationSettings> {
    const response = await apiClient.patch<ApiResponse<UserNotificationSettings>>(`/users/${id}/notification-settings`, settings)
    return response.data!
  }

  async sendUserNotification(id: number, notification: {
    title: string
    message: string
    type: 'info' | 'warning' | 'success' | 'error'
    action_url?: string
  }): Promise<{
    message: string
    notification_sent: boolean
  }> {
    const response = await apiClient.post<ApiResponse<any>>(`/users/${id}/notify`, notification)
    return response.data!
  }

  // Role and Permission Management
  async getUserPermissions(id: number): Promise<{
    user: User
    role_permissions: string[]
    additional_permissions: string[]
    restricted_permissions: string[]
    effective_permissions: string[]
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/users/${id}/permissions`)
    return response.data!
  }

  async updateUserRole(id: number, role: string, reason?: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/role`, { role, reason })
    return response.data!
  }

  async getAvailableRoles(): Promise<Array<{
    key: string
    display_name: string
    description: string
    permissions: string[]
    hierarchy_level: number
  }>> {
    const response = await apiClient.get<ApiResponse<any>>('/users/roles')
    return response.data!
  }

  async getDepartments(): Promise<Array<{
    name: string
    user_count: number
  }>> {
    const response = await apiClient.get<ApiResponse<any>>('/users/departments')
    return response.data!
  }

  // Import/Export
  async exportUsers(filters?: UserFilters): Promise<Blob> {
    const response = await apiClient.get('/users/export', {
      params: filters,
      headers: {
        'Accept': 'text/csv'
      }
    })
    return response as Blob
  }

  async importUsers(file: File): Promise<{
    total_processed: number
    successful_imports: number
    failed_imports: number
    errors: Array<{
      row: number
      error: string
    }>
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.upload<ApiResponse<any>>('/users/import', formData)
    return response.data!
  }
}

// Export singleton instance
export const usersApi = new UsersApi()

// Export the class for testing
export { UsersApi }