/**
 * Mock data for the Inventory Discrepancies page.
 *
 * Ownership: Inventory Staff investigate and resolve discrepancy reports.
 * Warehouse Staff can only raise a concern (create a report) from
 * warehouse/report-discrepancy/ReportDiscrepancyPage.jsx — they don't see this
 * management view. Reports whose variance is large enough to need a
 * write-off or a stock adjustment are flagged `requires_approval: true` and
 * surface on the Manager's Adjustment Approvals page once Inventory sets
 * `approval_status: 'pending'`.
 *
 * Shape must match the fields read by DiscrepanciesPage.jsx (inventory) and
 * AdjustmentApprovalsPage.jsx (manager):
 * id, report_number, product_name, product_sku, expected_quantity,
 * actual_quantity, variance, variance_percentage, discrepancy_type,
 * location, priority, status, created_at, reported_by,
 * requires_approval, approval_status, write_off_amount, approved_by, approved_at
 */

import { validateMockData } from '../validate'

export const mockDiscrepancies = [
  { id: 1, report_number: 'DISC-2024-001', product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', expected_quantity: 15, actual_quantity: 13, variance: -2, variance_percentage: -13.3, discrepancy_type: 'shortage', location: 'A-01-03', priority: 'medium', status: 'open', created_at: '2024-08-14T09:00:00Z', reported_by: 'Warehouse Staff', requires_approval: true, approval_status: null, write_off_amount: null, approved_by: null, approved_at: null },
  { id: 2, report_number: 'DISC-2024-002', product_name: 'LG Washing Machine 8kg', product_sku: 'LG-WM8', expected_quantity: 5, actual_quantity: 5, variance: 0, variance_percentage: 0, discrepancy_type: 'count_confirmed', location: 'B-02-01', priority: 'low', status: 'resolved', created_at: '2024-08-13T14:00:00Z', reported_by: 'Warehouse Staff', requires_approval: false, approval_status: null, write_off_amount: null, approved_by: null, approved_at: null },
  { id: 3, report_number: 'DISC-2024-003', product_name: 'Whirlpool Microwave 25L', product_sku: 'WP-MW25', expected_quantity: 20, actual_quantity: 18, variance: -2, variance_percentage: -10.0, discrepancy_type: 'shortage', location: 'D-03-01', priority: 'medium', status: 'investigating', created_at: '2024-08-12T10:30:00Z', reported_by: 'Warehouse Staff', requires_approval: true, approval_status: 'pending', write_off_amount: 15400, approved_by: null, approved_at: null },
  { id: 4, report_number: 'DISC-2024-004', product_name: 'Sharp Rice Cooker 1.8L', product_sku: 'SHRP-RC18', expected_quantity: 0, actual_quantity: 2, variance: 2, variance_percentage: 100, discrepancy_type: 'overage', location: 'A-02-04', priority: 'high', status: 'open', created_at: '2024-08-11T16:00:00Z', reported_by: 'Warehouse Staff', requires_approval: true, approval_status: null, write_off_amount: null, approved_by: null, approved_at: null },
  { id: 5, report_number: 'DISC-2024-005', product_name: 'Panasonic Air Conditioner 1HP', product_sku: 'PANA-AC1HP', expected_quantity: 10, actual_quantity: 7, variance: -3, variance_percentage: -30.0, discrepancy_type: 'theft', location: 'C-01-02', priority: 'high', status: 'resolved', created_at: '2024-08-09T08:15:00Z', reported_by: 'Warehouse Staff', requires_approval: true, approval_status: 'approved', write_off_amount: 26700, approved_by: 'Juan Dela Cruz (Manager)', approved_at: '2024-08-10T11:00:00Z' },
  { id: 6, report_number: 'DISC-2024-006', product_name: 'Electrolux Vacuum Cleaner', product_sku: 'ELEC-VC01', expected_quantity: 12, actual_quantity: 10, variance: -2, variance_percentage: -16.7, discrepancy_type: 'damage', location: 'B-04-02', priority: 'medium', status: 'investigating', created_at: '2024-08-08T13:40:00Z', reported_by: 'Warehouse Staff', requires_approval: true, approval_status: 'rejected', write_off_amount: 9800, approved_by: 'Juan Dela Cruz (Manager)', approved_at: '2024-08-09T09:20:00Z' },
]

validateMockData('inventory/discrepancies', mockDiscrepancies)
