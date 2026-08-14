/**
 * Base API client with authentication and error handling
 */

import { ApiResponse, PaginatedResponse } from '@/types'

interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
}

class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api') {
    this.baseURL = baseURL.replace(/\/+$/, '') // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private getHeaders(config?: RequestConfig): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...config?.headers }
    
    const token = this.getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')

    let data: any
    if (isJson) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        window.location.href = '/login'
        throw new ApiError(401, 'Authentication required')
      }

      // Handle validation errors
      if (response.status === 422 && data.errors) {
        throw new ApiError(response.status, data.message || 'Validation failed', data.errors)
      }

      // Handle other errors
      throw new ApiError(
        response.status,
        data.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return data
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(config),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(config),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  // Helper method for file uploads
  async upload<T = any>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint)
    const headers = { ...config?.headers }
    
    const token = this.getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Don't set Content-Type for FormData - let browser set it with boundary
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  // Convenience methods for common patterns
  async paginated<T>(
    endpoint: string, 
    params?: { page?: number; per_page?: number; [key: string]: any },
    config?: RequestConfig
  ): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(endpoint, {
      ...config,
      params: { per_page: 15, ...params }
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export types and classes for use in other files
export { ApiClient, ApiError }
export type { RequestConfig }