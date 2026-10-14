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
  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  getCSRFToken() {
    // Extract XSRF-TOKEN from cookie and decode
    const cookies = document.cookie.split(';')
    const xsrfCookie = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='))
    if (xsrfCookie) {
      const token = xsrfCookie.split('=')[1]
      
      // Validate token format before decoding
      if (!token) {
        return null
      }
      
      try {
        return decodeURIComponent(token)
      } catch (error) {
        // Handle malformed cookie values gracefully
        console.warn('Failed to decode CSRF token from cookie:', error)
        return null
      }
    }
    return null
  }

  getHeaders(config, method = 'GET') {
    const headers = { ...this.defaultHeaders, ...config?.headers }
    
    // Add CSRF token for mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      const csrfToken = this.getCSRFToken()
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken
      }
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
      // The backend uses two error envelopes:
      //   Laravel/controller:  { message, errors }
      //   Core exception handler (FormRequest validation, 403/404 ...):
      //                        { error: { code, message, context: { errors } } }
      // Read both so messages and per-field validation errors always surface.
      const body = data && typeof data === 'object' ? data : {}
      const message = body.message || body.error?.message
      const rawErrors = body.errors ?? body.error?.context?.errors
      const errors =
        rawErrors && typeof rawErrors === 'object' && Object.keys(rawErrors).length > 0
          ? rawErrors
          : undefined

      // Handle authentication errors
      if (response.status === 401) {
        window.location.href = '/login'
        throw new ApiError(401, 'Authentication required')
      }

      // Handle validation errors
      if (response.status === 422 && errors) {
        throw new ApiError(response.status, message || 'Validation failed', errors)
      }

      // Handle server errors
      if (response.status >= 500) {
        // Show toast notification for server errors
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('notification', {
            detail: {
              type: 'error',
              title: 'Server Error',
              message: message || `HTTP ${response.status}: ${response.statusText}`
            }
          }))
        }
        throw new ApiError(
          response.status,
          message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      // Handle other errors
      throw new ApiError(
        response.status,
        message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return data
  }

  buildUrl(endpoint, params) {
    // Use relative URLs for all API calls
    const url = new URL(endpoint, window.location.origin)
    
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
      headers: this.getHeaders(config, 'GET'),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async post(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config, 'POST'),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async put(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(config, 'PUT'),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async patch(endpoint, data, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(config, 'PATCH'),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  async delete(endpoint, config) {
    const url = this.buildUrl(endpoint)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(config, 'DELETE'),
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    })

    return this.handleResponse(response)
  }

  // Helper method for file uploads
  async upload(endpoint, formData, config) {
    const url = this.buildUrl(endpoint)
    const headers = { ...config?.headers }
    
    // Add CSRF token for uploads
    const csrfToken = this.getCSRFToken()
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken
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