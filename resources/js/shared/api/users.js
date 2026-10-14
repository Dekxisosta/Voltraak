/**
 * User Management API - User CRUD, Authentication, Role Management
 */

import { apiClient } from './client'

/**
 * Backend list envelope: { success, message, data: { items: [...], pagination }, timestamp }
 * Mock data source: a bare array. Accept both.
 */
export function extractUsers(response) {
  const payload = response?.data ?? response
  const list = payload?.items ?? payload
  return Array.isArray(list) ? list : []
}

/** Backend single-user envelope: { success, message, data: <user> }. */
export function extractUser(response) {
  return response?.data ?? response
}

/**
 * Map a backend UserResource to the shape the user-management tables use.
 * The API exposes `last_login_at`; the table/mocks use `last_login`.
 */
export function normalizeUser(user) {
  if (!user) return user
  return {
    ...user,
    last_login: user.last_login ?? user.last_login_at ?? null,
  }
}

/**
 * Fetch every page of users (the endpoint paginates, 15 by default).
 * Capped at 100 per page server-side.
 */
export async function fetchAllUsers(params = {}) {
  const perPage = 100
  const users = []
  let page = 1
  let lastPage = 1
  do {
    const response = await apiClient.get('/api/v1/users', { params: { ...params, per_page: perPage, page } })
    users.push(...extractUsers(response))
    lastPage = response?.data?.pagination?.last_page ?? 1
    page += 1
  } while (page <= lastPage)
  return users.map(normalizeUser)
}

export const usersApi = {
  // ===== User CRUD =====

  /**
   * Get list of users
   * @param {Object} params - Query parameters (role, status, page, per_page, etc.)
   * @returns {Promise<Object>} Users list with pagination
   */
  async getUsers(params = {}) {
    return apiClient.get('/api/v1/users', { params })
  },

  /**
   * Get a single user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} User details
   */
  async getUser(id) {
    return apiClient.get(`/api/v1/users/${id}`)
  },

  /**
   * Create a new user
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(data) {
    return apiClient.post('/api/v1/users', data)
  },

  /**
   * Update a user
   * @param {number} id - User ID
   * @param {Object} data - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, data) {
    return apiClient.put(`/api/v1/users/${id}`, data)
  },

  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(id) {
    return apiClient.delete(`/api/v1/users/${id}`)
  },

  /**
   * Toggle user status (active/inactive)
   * @param {number} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async toggleUserStatus(id) {
    return apiClient.patch(`/api/v1/users/${id}/toggle-status`)
  },

  /**
   * Reset user password
   * @param {number} id - User ID
   * @param {Object} data - Password reset data
   * @returns {Promise<Object>} Password reset result
   */
  async resetUserPassword(id, data) {
    return apiClient.post(`/api/v1/users/${id}/reset-password`, data)
  },

  /**
   * Bulk update users
   * @param {Object} data - Bulk update data
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdateUsers(data) {
    return apiClient.post('/api/v1/users/bulk-update', data)
  },

  // ===== User Analytics =====

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics and metrics
   */
  async getUserStatistics() {
    return apiClient.get('/api/v1/users/statistics')
  },

  /**
   * Get users requiring attention
   * @returns {Promise<Array>} Users needing management attention
   */
  async getUsersRequiringAttention() {
    return apiClient.get('/api/v1/users/requires-attention')
  },

  /**
   * Get user activity report
   * @param {number} id - User ID
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} User activity report
   */
  async getUserActivityReport(id, params = {}) {
    return apiClient.get(`/api/v1/users/${id}/activity-report`, { params })
  },

  // ===== Profile Management =====

  /**
   * Get user profile
   * @returns {Promise<Object>} Current user profile
   */
  async getProfile() {
    return apiClient.get('/api/v1/users/profile')
  },

  /**
   * Update user profile
   * @param {Object} data - Profile data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(data) {
    return apiClient.put('/api/v1/users/profile', data)
  },

  // ===== Management Routes =====

  /**
   * Get user overview for managers
   * @returns {Promise<Object>} Management user overview
   */
  async getUserOverview() {
    return apiClient.get('/api/v1/management/user-overview')
  },

  /**
   * Get attention alerts for managers
   * @returns {Promise<Array>} Management attention alerts
   */
  async getAttentionAlerts() {
    return apiClient.get('/api/v1/management/attention-alerts')
  },

  /**
   * Get staff activity
   * @returns {Promise<Object>} Staff activity data
   */
  async getStaffActivity() {
    return apiClient.get('/api/v1/staff/my-activity')
  }
}