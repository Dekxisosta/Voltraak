/**
 * Core TypeScript types for the Voltraak IMS frontend
 */

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[]
  meta: {
    current_page: number
    from: number
    last_page: number
    per_page: number
    to: number
    total: number
  }
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

// User types
export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  role_display: string
  phone?: string
  department?: string
  is_active: boolean
  last_login_at?: string
  email_verified_at?: string
  created_at: string
  updated_at: string
  display_name: string
  initials: string
}

export type UserRole = 'warehouse' | 'inventory_staff' | 'manager'

// Authentication types
export interface AuthUser extends User {
  permissions?: string[]
}

export interface AuthResponse {
  user: AuthUser
  token: string
  api_token: string
  expires_in: number
}

// Product types  
export interface Product {
  id: number
  name: string
  sku: string
  description?: string
  category: string
  unit_of_measure: string
  minimum_stock_level: number
  maximum_stock_level: number
  reorder_point: number
  current_stock: number
  reserved_stock: number
  available_stock: number
  total_value: number
  average_cost: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Batch types
export interface Batch {
  id: number
  product_id: number
  batch_number: string
  supplier_id: number
  quantity_received: number
  quantity_available: number
  quantity_reserved: number
  unit_cost: number
  total_cost: number
  manufacturing_date?: string
  expiry_date?: string
  received_date: string
  status: BatchStatus
  notes?: string
  created_at: string
  updated_at: string
  
  // Relationships
  product?: Product
  supplier?: Supplier
}

export type BatchStatus = 'safe' | 'warning' | 'expired' | 'recalled'

// Supplier types
export interface Supplier {
  id: number
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  payment_terms?: string
  lead_time_days: number
  is_active: boolean
  performance_rating?: number
  created_at: string
  updated_at: string
}

// Stock Transaction types
export interface StockTransaction {
  id: number
  product_id: number
  batch_id?: number
  type: StockTransactionType
  quantity: number
  unit_cost?: number
  total_cost?: number
  reference_number?: string
  notes?: string
  user_id: number
  created_at: string
  
  // Relationships
  product?: Product
  batch?: Batch
  user?: User
}

export type StockTransactionType = 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'damage' | 'return'

// Physical Count types
export interface PhysicalCount {
  id: number
  product_id: number
  batch_id?: number
  system_quantity: number
  counted_quantity: number
  variance_quantity: number
  variance_percentage: number
  variance_value: number
  notes?: string
  counted_by: number
  counted_at: string
  
  // Relationships  
  product?: Product
  batch?: Batch
  counter?: User
}

// Purchase Order types
export interface PurchaseOrder {
  id: number
  po_number: string
  supplier_id: number
  status: PurchaseOrderStatus
  order_date: string
  expected_delivery_date?: string
  delivery_date?: string
  total_amount: number
  notes?: string
  created_by: number
  approved_by?: number
  approved_at?: string
  created_at: string
  updated_at: string
  
  // Relationships
  supplier?: Supplier
  creator?: User
  approver?: User
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: number
  purchase_order_id: number
  product_id: number
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  
  // Relationships
  product?: Product
}

export type PurchaseOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'completed' | 'cancelled'

// Status types for UI components
export type StatusVariant = 'ok' | 'warning' | 'critical' | 'neutral'

// Form state types
export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isValid: boolean
}

// API client types
export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  delete<T>(url: string, config?: RequestConfig): Promise<T>
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
}

// Route types
export interface Route {
  path: string
  element: React.ComponentType
  title?: string
  roles?: UserRole[]
  children?: Route[]
}

// Dashboard data types
export interface DashboardStats {
  total_products: number
  total_batches: number
  low_stock_products: number
  expired_batches: number
  pending_orders: number
  inventory_accuracy: number
  inventory_turnover: number
  shrinkage_rate: number
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'primary' | 'secondary'
}

// Filter and sorting types
export interface FilterOptions {
  search?: string
  status?: string
  category?: string
  supplier?: string
  date_from?: string
  date_to?: string
  [key: string]: any
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
  width?: string
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  emptyMessage?: string
  className?: string
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Error types
export interface AppError extends Error {
  code?: string
  status?: number
  details?: any
}

// Additional types for role-based pages
export interface PickingTask {
  id: number
  order_number: string
  customer_name: string
  route: string
  priority: 'low' | 'medium' | 'high'
  items: PickingItem[]
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  due_time: string
}

export interface PickingItem {
  id: number
  product_name: string
  batch_number: string
  quantity: number
  bin_location: string
  expiry_date: string
  picked: boolean
}

export interface BatchRecommendation {
  id: number
  batch_number: string
  product_name: string
  product_sku: string
  quantity_available: number
  expiry_date: string
  days_until_expiry: number
  urgency_level: 'safe' | 'warning' | 'critical'
  bin_location: string
  supplier: string
  cost_per_unit: number
  total_value: number
  recommended_action: 'normal_rotation' | 'priority_sale' | 'immediate_sale'
  notes: string
}

export interface DiscrepancyReport {
  id: number
  report_number: string
  product_name: string
  product_sku: string
  expected_quantity: number
  actual_quantity: number
  variance: number
  variance_percentage: number
  discrepancy_type: 'shortage' | 'overage' | 'damage' | 'theft' | 'misplacement' | 'other'
  location: string
  reported_by: string
  status: 'open' | 'investigating' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  notes: string
  created_at: string
  resolved_at: string | null
}

export interface ProductStockLevel {
  id: number
  product_name: string
  product_sku: string
  category: string
  current_stock: number
  minimum_stock: number
  reorder_point: number
  maximum_stock: number
  reserved_stock: number
  available_stock: number
  location: string
  last_restock_date: string
  supplier: string
  unit_cost: number
  total_value: number
  turnover_rate: number
  status: 'out_of_stock' | 'critical' | 'warning' | 'ok'
}

export interface KPIDashboardData {
  metrics: {
    totalSKUs: number
    stockValue: number
    lowStockItems: number
    shrinkageRate: number
    inventoryAccuracy: number
    turnoverRate: number
    serviceLevel: number
    fefoCompliance: number
  }
  trends: {
    stockValue: Array<{ period: string; value: number }>
    turnover: Array<{ period: string; value: number }>
  }
  categoryBreakdown: Array<{
    category: string
    value: number
    color: string
  }>
  alerts: Array<{
    id: number
    type: 'warning' | 'critical'
    title: string
    message: string
    timestamp: string
  }>
}