/**
 * API client exports - centralized access to all API modules
 */

// Core client
import { ApiError } from './client'
import { authApi } from './auth'
import { inventoryApi } from './inventory'
import { procurementApi } from './procurement'
import { reportingApi } from './reporting'
import { usersApi } from './users'
import { notificationsApi } from './notifications'
import { systemApi } from './system'

// Re-export named APIs and classes
export { apiClient, ApiClient, ApiError } from './client'
export { authApi, AuthApi } from './auth'
export { inventoryApi, InventoryApi } from './inventory'
export { procurementApi, ProcurementApi } from './procurement'
export { reportingApi, ReportingApi } from './reporting'
export { usersApi, UsersApi } from './users'
export { notificationsApi, NotificationsApi } from './notifications'
export { systemApi, SystemApi } from './system'

// Convenience object with all API clients
export const api = {
  auth: authApi,
  inventory: inventoryApi,
  procurement: procurementApi,
  reporting: reportingApi,
  users: usersApi,
  notifications: notificationsApi,
  system: systemApi,
}

// Helper function to check if we're in a browser environment
export const isBrowser = typeof window !== 'undefined'

// Helper function to configure API base URL
export const configureApiClient = (_baseURL) => {
  // This would need to be implemented if we want to allow runtime configuration
  console.warn('Runtime API configuration not implemented. Please use environment variables.')
}

// Error handling utilities
export const isApiError = (error) => {
  return error instanceof ApiError
}

export const getErrorMessage = (error) => {
  if (isApiError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

export const getValidationErrors = (error) => {
  if (isApiError(error) && error.errors) {
    return error.errors
  }

  return null
}

// Request interceptor utility (for adding common headers, logging, etc.)
export const addRequestInterceptor = (_interceptor) => {
  // This would need to be implemented in the base ApiClient class
  console.warn('Request interceptors not implemented in base client')
}

// Response interceptor utility
export const addResponseInterceptor = (_interceptor) => {
  // This would need to be implemented in the base ApiClient class
  console.warn('Response interceptors not implemented in base client')
}

// API client health check
export const checkApiHealth = async () => {
  try {
    await systemApi.healthCheck()
    return true
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

// Utility to refresh authentication token
export const refreshAuthToken = async () => {
  try {
    await authApi.refreshToken()
    return true
  } catch (error) {
    console.error('Token refresh failed:', error)
    authApi.clearAuth()
    return false
  }
}
