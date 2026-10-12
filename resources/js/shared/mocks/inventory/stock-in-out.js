/**
 * Mock data for Inventory Stock In/Out page
 * Shape must match the fields read by StockInOutPage.jsx columns/filters:
 * id, transaction_number, type, product_name, product_sku, quantity,
 * reference_number, reason, performed_by, created_at
 */

import { validateMockData } from '../validate'

export const mockStockTransactions = [
  { id: 1, transaction_number: 'TXN-IN-001', type: 'stock_in', product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', quantity: 10, reference_number: 'PO-2024-001', reason: 'Purchase Order Receipt', performed_by: 'Warehouse Staff', created_at: '2024-08-14T09:00:00Z' },
  { id: 2, transaction_number: 'TXN-OUT-001', type: 'stock_out', product_name: 'LG Washing Machine 8kg', product_sku: 'LG-WM8', quantity: 2, reference_number: 'ORD-2024-0112', reason: 'Customer Order', performed_by: 'Warehouse Staff', created_at: '2024-08-14T10:30:00Z' },
  { id: 3, transaction_number: 'TXN-IN-002', type: 'stock_in', product_name: 'Panasonic Air Conditioner 1.5HP', product_sku: 'PAN-AC15', quantity: 5, reference_number: 'PO-2024-003', reason: 'Purchase Order Receipt', performed_by: 'Inventory Staff', created_at: '2024-08-13T14:00:00Z' },
  { id: 4, transaction_number: 'TXN-OUT-002', type: 'stock_out', product_name: 'Whirlpool Microwave 25L', product_sku: 'WP-MW25', quantity: 3, reference_number: 'ORD-2024-0113', reason: 'Customer Order', performed_by: 'Warehouse Staff', created_at: '2024-08-13T11:00:00Z' },
  { id: 5, transaction_number: 'TXN-OUT-003', type: 'stock_out', product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', quantity: 2, reference_number: 'ADJ-2024-001', reason: 'Adjustment - Found', performed_by: 'Inventory Staff', created_at: '2024-08-12T16:00:00Z' },
]

validateMockData('inventory/stock-in-out', mockStockTransactions)
