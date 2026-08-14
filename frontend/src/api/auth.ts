/**
 * Authentication API client
 */

import { apiClient } from './client'
import type { User, AuthResponse, ApiResponse } from '@/types'

export interface LoginRequest {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: string
  phone?: string
  department?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export interface ChangePasswordRequest {
  current_password: string
  password: string
  password_confirmation: string
}

class AuthApi {
  /**
   * Authenticate user and return JWT token
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    
    // Store both tokens from response
    if (response.data) {
      // Use api_token for API requests (Sanctum)
      localStorage.setItem('auth_token', response.data.api_token)
      localStorage.setItem('auth_user', JSON.stringify(response.data.user))
    }
    
    return response.data!
  }

  /**
   * Logout and invalidate token
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Always clear local storage even if API call fails
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  /**
   * Get current authenticated user
   */
  async me(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me')
    
    // Update cached user data
    if (response.data) {
      localStorage.setItem('auth_user', JSON.stringify(response.data))
    }
    
    return response.data!
  }

  /**
   * Register new user (admin only)
   */
  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', userData)
    return response.data!
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', email)
    return response.data!
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', resetData)
    return response.data!
  }

  /**
   * Change current user's password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.patch<ApiResponse<{ message: string }>>('/auth/change-password', passwordData)
    return response.data!
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(): Promise<{ token: string; api_token: string; expires_in: number }> {
    const response = await apiClient.post<ApiResponse<{ token: string; api_token: string; expires_in: number }>>('/auth/refresh')
    
    // Update stored token (use api_token for API requests)
    if (response.data) {
      localStorage.setItem('auth_token', response.data.api_token)
    }
    
    return response.data!
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(`/auth/verify-email/${token}`)
    return response.data!
  }

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/resend-verification')
    return response.data!
  }

  /**
   * Get stored authentication token
   */
  getStoredToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userData = localStorage.getItem('auth_user')
    return userData ? JSON.parse(userData) : null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken()
    const user = this.getStoredUser()
    return !!(token && user)
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }
}

// Export singleton instance
export const authApi = new AuthApi()

// Export the class for testing
export { AuthApi }