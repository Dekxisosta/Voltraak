/**
 * Mock data for Warehouse Discrepancies page
 * Shape must match the fields read by DiscrepanciesPage.jsx columns/filters:
 * id, report_number, product_name, product_sku, expected_quantity,
 * actual_quantity, variance, variance_percentage, discrepancy_type,
 * location, priority, status, created_at
 */

import { validateMockData } from '../validate'

export const mockDiscrepancies = [
  { id: 1, report_number: 'DISC-2024-001', product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', expected_quantity: 15, actual_quantity: 13, variance: -2, variance_percentage: -13.3, discrepancy_type: 'shortage', location: 'A-01-03', priority: 'medium', status: 'open', created_at: '2024-08-14T09:00:00Z' },
  { id: 2, report_number: 'DISC-2024-002', product_name: 'LG Washing Machine 8kg', product_sku: 'LG-WM8', expected_quantity: 5, actual_quantity: 5, variance: 0, variance_percentage: 0, discrepancy_type: 'count_confirmed', location: 'B-02-01', priority: 'low', status: 'resolved', created_at: '2024-08-13T14:00:00Z' },
  { id: 3, report_number: 'DISC-2024-003', product_name: 'Whirlpool Microwave 25L', product_sku: 'WP-MW25', expected_quantity: 20, actual_quantity: 18, variance: -2, variance_percentage: -10.0, discrepancy_type: 'shortage', location: 'D-03-01', priority: 'medium', status: 'investigating', created_at: '2024-08-12T10:30:00Z' },
  { id: 4, report_number: 'DISC-2024-004', product_name: 'Sharp Rice Cooker 1.8L', product_sku: 'SHRP-RC18', expected_quantity: 0, actual_quantity: 2, variance: 2, variance_percentage: 100, discrepancy_type: 'overage', location: 'A-02-04', priority: 'high', status: 'open', created_at: '2024-08-11T16:00:00Z' },
]

validateMockData('warehouse/discrepancies', mockDiscrepancies)
