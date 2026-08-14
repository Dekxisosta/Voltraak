/**
 * Authentication API client
 * Only the token is stored in localStorage. User data comes from the API.
 */

import { apiClient } from './client'

const TOKEN_KEY = 'auth_token'

class AuthApi {
  /**
   * Authenticate user and return JWT token + user data
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials)

    if (response.data?.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token)
    }

    return response.data
  }

  /**
   * Logout and invalidate token
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  /**
   * Get current authenticated user from backend
   */
  async me() {
    const response = await apiClient.get('/auth/me')
    return response.data
  }

  /**
   * Refresh JWT token
   */
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh')

    if (response.data?.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token)
    }

    return response.data
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgot-password', email)
    return response.data
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData) {
    const response = await apiClient.post('/auth/reset-password', resetData)
    return response.data
  }

  /**
   * Change current user's password
   */
  async changePassword(passwordData) {
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
