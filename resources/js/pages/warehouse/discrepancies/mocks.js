/**
 * Mock data for Warehouse Discrepancies page
 */

export const mockDiscrepancies = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', batch_number: 'BATCH-2024-001', system_qty: 15, physical_qty: 13, variance: -2, variance_percent: -13.3, reported_by: 'Warehouse Staff', reported_at: '2024-08-14T09:00:00Z', status: 'open', resolution: null },
  { id: 2, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', batch_number: 'BATCH-2024-003', system_qty: 5, physical_qty: 5, variance: 0, variance_percent: 0, reported_by: 'Inventory Staff', reported_at: '2024-08-13T14:00:00Z', status: 'resolved', resolution: 'Confirmed accurate' },
  { id: 3, product_name: 'Whirlpool Microwave 25L', sku: 'WP-MW25', batch_number: 'BATCH-2024-007', system_qty: 20, physical_qty: 18, variance: -2, variance_percent: -10.0, reported_by: 'Warehouse Staff', reported_at: '2024-08-12T10:30:00Z', status: 'investigating', resolution: null },
  { id: 4, product_name: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', batch_number: 'BATCH-2024-002', system_qty: 0, physical_qty: 2, variance: 2, variance_percent: 100, reported_by: 'Inventory Staff', reported_at: '2024-08-11T16:00:00Z', status: 'open', resolution: null },
]
