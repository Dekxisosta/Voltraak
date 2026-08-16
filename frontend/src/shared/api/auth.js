/**
 * Authentication API client
 * Only the token is stored in localStorage. User data comes from the API.
 *
 * Follows the same VITE_DATA_SOURCE toggle as shared/services/dataSource.js:
 * with the default "mocks" setting, every method below resolves against
 * shared/mocks/auth.js instead of hitting a real backend, so the whole app
 * (including login) works with no server running. Set VITE_DATA_SOURCE=api
 * to talk to the real backend instead.
 */

import { apiClient } from './client'
import { mockAuthApi } from '../mocks/auth'

const TOKEN_KEY = 'auth_token'
const USE_MOCKS = import.meta.env.VITE_DATA_SOURCE !== 'api'

class AuthApi {
  /**
   * Authenticate user and return JWT token + user data
   */
  async login(credentials) {
    const data = USE_MOCKS
      ? await mockAuthApi.login(credentials)
      : (await apiClient.post('/auth/login', credentials)).data

    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
    }

    return data
  }

  /**
   * Logout and invalidate token
   */
  async logout() {
    try {
      if (USE_MOCKS) {
        await mockAuthApi.logout()
      } else {
        await apiClient.post('/auth/logout')
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  /**
   * Get current authenticated user from backend
   */
  async me() {
    if (USE_MOCKS) {
      return mockAuthApi.me(this.getStoredToken())
    }
    const response = await apiClient.get('/auth/me')
    return response.data
  }

  /**
   * Refresh JWT token
   */
  async refreshToken() {
    const data = USE_MOCKS
      ? await mockAuthApi.refreshToken(this.getStoredToken())
      : (await apiClient.post('/auth/refresh')).data

    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
    }

    return data
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    if (USE_MOCKS) {
      return mockAuthApi.forgotPassword(email)
    }
    const response = await apiClient.post('/auth/forgot-password', email)
    return response.data
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData) {
    if (USE_MOCKS) {
      return mockAuthApi.resetPassword(resetData)
    }
    const response = await apiClient.post('/auth/reset-password', resetData)
    return response.data
  }

  /**
   * Update current user's profile (name/email)
   */
  async updateProfile(patch) {
    if (USE_MOCKS) {
      return mockAuthApi.updateProfile(this.getStoredToken(), patch)
    }
    const response = await apiClient.patch('/auth/profile', patch)
    return response.data
  }

  /**
   * Change current user's password
   */
  async changePassword(passwordData) {
    if (USE_MOCKS) {
      return mockAuthApi.changePassword(this.getStoredToken(), passwordData)
    }
    const response = await apiClient.patch('/auth/change-password', passwordData)
    return response.data
  }

  /**
   * Get stored token
   */
  getStoredToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  /**
   * Check if a token exists (does NOT guarantee validity)
   */
  hasToken() {
    return !!this.getStoredToken()
  }

  /**
   * Clear token from storage
   */
  clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const authApi = new AuthApi()
export { AuthApi }
