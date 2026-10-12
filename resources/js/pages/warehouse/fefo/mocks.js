/**
 * Mock data for Warehouse FEFO page
 */

export const mockFEFORecommendations = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', batch_number: 'BATCH-2024-001', quantity_available: 12, expiry_date: '2025-01-10', days_to_expiry: 149, urgency: 'normal', location: 'A-01-03', recommended_action: 'Standard FEFO pick' },
  { id: 2, product_name: 'LG Washing Machine 8kg', batch_number: 'BATCH-2024-003', quantity_available: 3, expiry_date: '2024-10-15', days_to_expiry: 62, urgency: 'normal', location: 'B-02-01', recommended_action: 'Standard FEFO pick' },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', batch_number: 'BATCH-2024-005', quantity_available: 5, expiry_date: '2024-09-20', days_to_expiry: 37, urgency: 'warning', location: 'C-01-02', recommended_action: 'Prioritize for next pick' },
  { id: 4, product_name: 'Whirlpool Microwave 25L', batch_number: 'BATCH-2024-007', quantity_available: 8, expiry_date: '2024-08-25', days_to_expiry: 11, urgency: 'critical', location: 'D-03-01', recommended_action: 'Immediate pick required' },
  { id: 5, product_name: 'Sharp Rice Cooker 1.8L', batch_number: 'BATCH-2024-002', quantity_available: 2, expiry_date: '2024-08-18', days_to_expiry: 4, urgency: 'critical', location: 'A-02-04', recommended_action: 'Urgent - expiring in 4 days' },
]
