/**
 * Mock data for Inventory Damage Report page
 */

export const mockDamageReports = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', batch_number: 'BATCH-2024-001', damage_type: 'Physical Damage', severity: 'moderate', quantity_affected: 2, reported_by: 'Warehouse Staff', reported_at: '2024-08-12T09:30:00Z', status: 'pending_review', notes: 'Dented side panel during unloading' },
  { id: 2, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', batch_number: 'BATCH-2024-003', damage_type: 'Water Damage', severity: 'severe', quantity_affected: 1, reported_by: 'Inventory Staff', reported_at: '2024-08-10T14:15:00Z', status: 'resolved', notes: 'Leaking packaging during storage' },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', sku: 'PAN-AC15', batch_number: 'BATCH-2024-005', damage_type: 'Cosmetic Damage', severity: 'minor', quantity_affected: 3, reported_by: 'Warehouse Staff', reported_at: '2024-08-14T08:00:00Z', status: 'under_investigation', notes: 'Scratched outer casing' },
]
