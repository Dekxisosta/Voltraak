/**
 * Mock data for Warehouse FEFO (First Expired, First Out) page
 * Shape must match the fields read by FEFOPage.jsx columns/filters:
 * id, batch_number, product_name, product_sku, quantity_available,
 * bin_location, expiry_date, urgency_level, days_until_expiry,
 * total_value, recommended_action
 */

import { validateMockData } from '../validate'

export const mockFEFORecommendations = [
  { id: 1, batch_number: 'BATCH-2024-002', product_name: 'Sharp Rice Cooker 1.8L', product_sku: 'SHRP-RC18', quantity_available: 8, bin_location: 'A-02-04', expiry_date: '2024-08-20', urgency_level: 'critical', days_until_expiry: 4, total_value: 12000, recommended_action: 'immediate_sale', notes: 'Slow-moving stock, prioritize clearance' },
  { id: 2, batch_number: 'BATCH-2024-007', product_name: 'Whirlpool Microwave 25L', product_sku: 'WP-MW25', quantity_available: 18, bin_location: 'D-03-01', expiry_date: '2024-08-25', urgency_level: 'critical', days_until_expiry: 9, total_value: 54000, recommended_action: 'immediate_sale' },
  { id: 3, batch_number: 'BATCH-2024-005', product_name: 'Panasonic Air Conditioner 1.5HP', product_sku: 'PAN-AC15', quantity_available: 7, bin_location: 'C-01-02', expiry_date: '2024-09-20', urgency_level: 'warning', days_until_expiry: 35, total_value: 91000, recommended_action: 'priority_sale' },
  { id: 4, batch_number: 'BATCH-2024-003', product_name: 'LG Washing Machine 8kg', product_sku: 'LG-WM8', quantity_available: 3, bin_location: 'B-02-01', expiry_date: '2024-10-15', urgency_level: 'warning', days_until_expiry: 60, total_value: 45000, recommended_action: 'priority_sale' },
  { id: 5, batch_number: 'BATCH-2024-001', product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', quantity_available: 12, bin_location: 'A-01-03', expiry_date: '2025-01-10', urgency_level: 'safe', days_until_expiry: 147, total_value: 228000, recommended_action: 'normal_rotation' },
]

validateMockData('warehouse/fefo', mockFEFORecommendations)
