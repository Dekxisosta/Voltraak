/**
 * Auth API client tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authApi } from '@/shared/api/auth'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('successfully logs in user', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'manager',
          },
          token: 'jwt-token',
          api_token: 'api-token',
          expires_in: 3600,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.login({
        email: 'john@example.com',
        password: 'password123',
      })

      expect(result).toEqual(mockResponse.data)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'john@example.com',
            password: 'password123',
          }),
        })
      )

      // Verify tokens are stored
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'api-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(mockResponse.data.user)
      )
    })

    it('handles login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Invalid credentials',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(
        authApi.login({
          email: 'john@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('includes remember option in request', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: 1, name: 'John', email: 'john@example.com', role: 'user' },
          token: 'jwt-token',
          api_token: 'api-token',
          expires_in: 3600,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await authApi.login({
        email: 'john@example.com',
        password: 'password123',
        remember: true,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            email: 'john@example.com',
            password: 'password123',
            remember: true,
          }),
        })
      )
    })
  })

  describe('logout', () => {
    it('successfully logs out user', async () => {
      mockLocalStorage.getItem.mockReturnValue('auth-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await authApi.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer auth-token',
          }),
        })
      )

      // Verify tokens are cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
    })

    it('clears tokens even when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await authApi.logout()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
    })
  })

  describe('me', () => {
    it('successfully gets current user', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'manager',
      }

      mockLocalStorage.getItem.mockReturnValue('auth-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUser,
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.me()

      expect(result).toEqual(mockUser)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer auth-token',
          }),
        })
      )

      // Verify user data is cached
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(mockUser)
      )
    })

    it('handles unauthorized response', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Unauthorized',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(authApi.me()).rejects.toThrow('Unauthorized')
    })
  })

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      const mockResponse = {
        token: 'new-jwt-token',
        api_token: 'new-api-token',
        expires_in: 3600,
      }

      mockLocalStorage.getItem.mockReturnValue('old-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.refreshToken()

      expect(result).toEqual(mockResponse)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-api-token')
    })

    it('handles refresh failure', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Token expired',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(authApi.refreshToken()).rejects.toThrow('Token expired')
    })
  })

  describe('changePassword', () => {
    it('successfully changes password', async () => {
      mockLocalStorage.getItem.mockReturnValue('auth-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Password changed successfully' },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.changePassword({
        current_password: 'oldpass',
        password: 'newpass123',
        password_confirmation: 'newpass123',
      })

      expect(result).toEqual({ message: 'Password changed successfully' })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/change-password',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            current_password: 'oldpass',
            password: 'newpass123',
            password_confirmation: 'newpass123',
          }),
        })
      )
    })

    it('handles validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          message: 'Validation failed',
          errors: {
            current_password: ['The current password is incorrect'],
          },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      await expect(
        authApi.changePassword({
          current_password: 'wrongpass',
          password: 'newpass123',
          password_confirmation: 'newpass123',
        })
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('forgotPassword', () => {
    it('successfully requests password reset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Reset link sent to your email' },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.forgotPassword({
        email: 'john@example.com',
      })

      expect(result).toEqual({ message: 'Reset link sent to your email' })
    })
  })

  describe('resetPassword', () => {
    it('successfully resets password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Password reset successfully' },
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await authApi.resetPassword({
        token: 'reset-token',
        email: 'john@example.com',
        password: 'newpass123',
        password_confirmation: 'newpass123',
      })

      expect(result).toEqual({ message: 'Password reset successfully' })
    })
  })

  describe('helper methods', () => {
    it('gets stored token', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token')
      
      const token = authApi.getStoredToken()
      
      expect(token).toBe('stored-token')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('gets stored user', () => {
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser))
      
      const user = authApi.getStoredUser()
      
      expect(user).toEqual(mockUser)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_user')
    })

    it('returns null for invalid stored user JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')
      
      const user = authApi.getStoredUser()
      
      expect(user).toBeNull()
    })

    it('checks authentication status', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce('{"id": 1}')
      
      expect(authApi.isAuthenticated()).toBe(true)
      
      mockLocalStorage.getItem.mockReturnValue(null)
      expect(authApi.isAuthenticated()).toBe(false)
    })

    it('clears auth data', () => {
      authApi.clearAuth()
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
    })
  })
})