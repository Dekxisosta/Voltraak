/**
 * API client exports - centralized access to all API modules
 */

// Core client
export { apiClient, ApiClient, ApiError } from './client'
export type { RequestConfig } from './client'

// Authentication
export { authApi, AuthApi } from './auth'
export type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest
} from './auth'

// Inventory Management
export { inventoryApi, InventoryApi } from './inventory'
export type {
  ProductFilters,
  CreateProductRequest,
  UpdateProductRequest,
  BatchFilters,
  CreateBatchRequest,
  UpdateBatchRequest,
  StockTransactionFilters,
  StockInRequest,
  StockOutRequest,
  StockTransferRequest,
  PhysicalCountFilters,
  CreatePhysicalCountRequest,
  DiscrepancyFilters,
  CreateDiscrepancyRequest,
  UpdateDiscrepancyRequest,
  DamageReportRequest,
  ReservationRequest,
  UpdateReservationRequest
} from './inventory'

// Procurement Management
export { procurementApi, ProcurementApi } from './procurement'
export type {
  SupplierFilters,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PurchaseOrderFilters,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  ApprovePurchaseOrderRequest,
  RejectPurchaseOrderRequest,
  ReceivePurchaseOrderRequest,
  ReorderPointFilters,
  ReorderPointData,
  ProcurementRequestFilters,
  ProcurementRequest,
  UpdateProcurementRequestRequest
} from './procurement'

// Reporting and Analytics
export { reportingApi, ReportingApi } from './reporting'
export type {
  DashboardKPIData,
  InventoryReportFilters,
  InventoryReportData,
  ForecastReportData,
  ProcurementReportData,
  ExportOptions
} from './reporting'

// User Management
export { usersApi, UsersApi } from './users'
export type {
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  BulkUpdateUsersRequest,
  UserStatsData,
  UserActivityData,
  ResetUserPasswordRequest,
  UserNotificationSettings
} from './users'

// Notifications
export { notificationsApi, NotificationsApi } from './notifications'
export type {
  NotificationFilters,
  CreateNotificationRequest,
  NotificationStats,
  BulkActionRequest
} from './notifications'

// System and Health
export { systemApi, SystemApi } from './system'
export type {
  HealthCheckResponse,
  SystemStatsResponse,
  LogEntry,
  LogFilters
} from './system'

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

// Type for the complete API interface
export type ApiInterface = typeof api

// Helper function to check if we're in a browser environment
export const isBrowser = typeof window !== 'undefined'

// Helper function to configure API base URL
export const configureApiClient = (baseURL: string) => {
  // This would need to be implemented if we want to allow runtime configuration
  console.warn('Runtime API configuration not implemented. Please use environment variables.')
}

// Error handling utilities
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}

export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

export const getValidationErrors = (error: unknown): Record<string, string[]> | null => {
  if (isApiError(error) && error.errors) {
    return error.errors
  }
  
  return null
}

// Request interceptor utility (for adding common headers, logging, etc.)
export const addRequestInterceptor = (
  interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
) => {
  // This would need to be implemented in the base ApiClient class
  console.warn('Request interceptors not implemented in base client')
}

// Response interceptor utility
export const addResponseInterceptor = (
  interceptor: (response: any) => any | Promise<any>
) => {
  // This would need to be implemented in the base ApiClient class  
  console.warn('Response interceptors not implemented in base client')
}

// API client health check
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await systemApi.healthCheck()
    return true
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

// Utility to refresh authentication token
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    await authApi.refreshToken()
    return true
  } catch (error) {
    console.error('Token refresh failed:', error)
    authApi.clearAuth()
    return false
  }
}