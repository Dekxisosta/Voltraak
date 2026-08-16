/**
 * Mock data for Inventory Expiry Alerts page
 */

export const mockExpiryBatches = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', batch_number: 'BATCH-2024-001', quantity: 12, expiry_date: '2025-01-10', days_to_expiry: 149, status: 'safe' },
  { id: 2, product_name: 'LG Washing Machine 8kg', batch_number: 'BATCH-2024-003', quantity: 3, expiry_date: '2024-10-15', days_to_expiry: 62, status: 'safe' },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', batch_number: 'BATCH-2024-005', quantity: 5, expiry_date: '2024-09-20', days_to_expiry: 37, status: 'warning' },
  { id: 4, product_name: 'Whirlpool Microwave 25L', batch_number: 'BATCH-2024-007', quantity: 8, expiry_date: '2024-08-25', days_to_expiry: 11, status: 'warning' },
  { id: 5, product_name: 'Sharp Rice Cooker 1.8L', batch_number: 'BATCH-2024-002', quantity: 2, expiry_date: '2024-08-05', days_to_expiry: -9, status: 'expired' },
  { id: 6, product_name: 'Electrolux Vacuum Cleaner', batch_number: 'BATCH-2024-009', quantity: 4, expiry_date: '2024-08-10', days_to_expiry: -4, status: 'expired' },
]
