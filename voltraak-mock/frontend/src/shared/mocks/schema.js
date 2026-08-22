/**
 * Unified mock data schema
 *
 * This is the single source of truth for the shape every mock dataset must
 * satisfy. Each page component reads specific fields off its mock data
 * (e.g. `row.product_sku`, `row.status`); if a mock's field names drift from
 * what the page actually reads, the page silently renders `undefined`
 * instead of failing loudly.
 *
 * Every file in shared/mocks/** registers itself here and is checked by
 * validateMockData() (see validate.js) the moment it's imported, in dev
 * builds only. When the real API replaces a mock, keep this entry in sync
 * so the API response shape can be checked the same way.
 *
 * type: 'array'  -> data is an array of records; every record is checked
 *                    against `fields`.
 * type: 'object' -> data is a single object; its top-level keys are checked
 *                    against `fields`.
 */

export const MOCK_SCHEMAS = {
  'auth/login': {
    type: 'object',
    fields: ['user', 'token', 'expires_in'],
  },
  'auth/me': {
    type: 'object',
    fields: ['id', 'name', 'email', 'role', 'role_display', 'permissions'],
  },
  'warehouse/discrepancies': {
    type: 'array',
    fields: [
      'id', 'report_number', 'product_name', 'product_sku',
      'expected_quantity', 'actual_quantity', 'variance', 'variance_percentage',
      'discrepancy_type', 'location', 'priority', 'status', 'created_at',
    ],
  },
  'warehouse/fefo': {
    type: 'array',
    fields: [
      'id', 'batch_number', 'product_name', 'product_sku', 'quantity_available',
      'bin_location', 'expiry_date', 'urgency_level', 'days_until_expiry',
      'total_value', 'recommended_action',
    ],
  },
  'warehouse/picking': {
    type: 'array',
    fields: [
      'id', 'order_number', 'customer_name', 'route', 'priority', 'status',
      'due_time', 'items',
    ],
  },
  'warehouse/receiving': {
    type: 'array',
    fields: [
      'id', 'po_number', 'supplier', 'total_amount', 'status',
      'expected_delivery', 'items',
    ],
  },
  'manager/users': {
    type: 'array',
    fields: ['id', 'name', 'email', 'role', 'is_active', 'last_login'],
  },
  'manager/po-approvals': {
    type: 'array',
    fields: [
      'id', 'po_number', 'supplier', 'total_amount', 'items_count',
      'requested_by', 'requested_at', 'status', 'priority',
    ],
  },
  'manager/kpi': {
    type: 'object',
    fields: ['metrics', 'trends', 'categoryBreakdown', 'alerts'],
  },
  'manager/forecast': {
    type: 'array',
    fields: [
      'id', 'product_name', 'sku', 'current_stock', 'avg_weekly_demand',
      'forecast_demand_8w', 'reorder_point', 'suggested_order', 'trend',
      'confidence',
    ],
  },
  'manager/low-stock': {
    type: 'array',
    fields: [
      'id', 'product_name', 'sku', 'current_stock', 'reorder_point',
      'days_until_stockout', 'status', 'suggested_order_qty',
    ],
  },
  'manager/reports': {
    type: 'object',
    fields: ['summary', 'category_breakdown', 'movement_summary', 'top_movers'],
  },
  'inventory/damage-report': {
    type: 'array',
    fields: [
      'id', 'product_name', 'sku', 'batch_number', 'damage_type', 'severity',
      'quantity_affected', 'status', 'reported_at',
    ],
  },
  'inventory/item-update': {
    type: 'array',
    fields: [
      'id', 'name', 'sku', 'category', 'unit_price', 'current_stock',
      'reorder_point', 'is_active', 'last_updated',
    ],
  },
  'inventory/reservations': {
    type: 'array',
    fields: [
      'id', 'order_number', 'customer_name', 'product_name', 'quantity',
      'reserved_at', 'expires_at', 'status',
    ],
  },
  'inventory/stock-levels': {
    type: 'array',
    fields: [
      'id', 'product_name', 'product_sku', 'category', 'location',
      'current_stock', 'available_stock', 'reserved_stock', 'minimum_stock',
      'reorder_point', 'maximum_stock', 'status', 'total_value',
      'turnover_rate', 'last_restock_date',
    ],
  },
  'inventory/stock-in-out': {
    type: 'array',
    fields: [
      'id', 'transaction_number', 'type', 'product_name', 'product_sku',
      'quantity', 'reference_number', 'reason', 'performed_by', 'created_at',
    ],
  },
  'inventory/expiry-alerts': {
    type: 'array',
    fields: [
      'id', 'product_name', 'batch_number', 'quantity', 'expiry_date',
      'days_to_expiry', 'status',
    ],
  },
}
