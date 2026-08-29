/**
 * Base API client with authentication and error handling
 */

class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

class ApiClient {
  constructor(baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api') {
    this.baseURL = baseURL.replace(/\/+$/, '') // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  getAuthToken() {
    return localStorage.getItem('auth_token')
  }

  getHeaders(config) {
    const headers = { ...this.defaultHeaders, ...config?.headers }
    
    const token = this.getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')

    let data
    if (isJson) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
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

  buildUrl(endpoint, params) {
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

  async get(endpoint, config) {
    const url = this.buildUrl(endpoint, config?.params)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(config),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async post(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async put(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async patch(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(config),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async delete(endpoint, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(config),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  // Helper method for file uploads
  async upload(endpoint, formData, config) {
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

    return this.handleResponse(response)
  }

  // Convenience methods for common patterns
  async paginated(endpoint, params, config) {
    return this.get(endpoint, {
      ...config,
      params: { per_page: 15, ...params }
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export types and classes for use in other files
export { ApiClient, ApiError }