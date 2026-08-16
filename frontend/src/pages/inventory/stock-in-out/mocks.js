/**
 * Mock data for Inventory Stock In/Out page
 */

export const mockStockTransactions = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', type: 'stock_in', quantity: 10, reference: 'PO-2024-001', performed_by: 'Warehouse Staff', created_at: '2024-08-14T09:00:00Z', notes: 'Received from supplier' },
  { id: 2, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', type: 'stock_out', quantity: 2, reference: 'ORD-2024-0112', performed_by: 'Warehouse Staff', created_at: '2024-08-14T10:30:00Z', notes: 'Customer order fulfillment' },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', sku: 'PAN-AC15', type: 'stock_in', quantity: 5, reference: 'PO-2024-003', performed_by: 'Inventory Staff', created_at: '2024-08-13T14:00:00Z', notes: 'Regular restocking' },
  { id: 4, product_name: 'Whirlpool Microwave 25L', sku: 'WP-MW25', type: 'stock_out', quantity: 3, reference: 'ORD-2024-0113', performed_by: 'Warehouse Staff', created_at: '2024-08-13T11:00:00Z', notes: 'Bulk customer order' },
  { id: 5, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', type: 'adjustment', quantity: -2, reference: 'ADJ-2024-001', performed_by: 'Inventory Staff', created_at: '2024-08-12T16:00:00Z', notes: 'Physical count adjustment' },
]
