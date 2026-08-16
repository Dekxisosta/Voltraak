/**
 * Mock data for Inventory Item Update page
 */

import { validateMockData } from '../validate'

export const mockProducts = [
  { id: 1, name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', category: 'Refrigerators', unit_price: 25990.00, current_stock: 15, available_stock: 12, reorder_point: 5, is_active: true, last_updated: '2024-08-10' },
  { id: 2, name: 'LG Washing Machine 8kg', sku: 'LG-WM8', category: 'Washing Machines', unit_price: 18990.00, current_stock: 3, available_stock: 3, reorder_point: 5, is_active: true, last_updated: '2024-08-08' },
  { id: 3, name: 'Panasonic Air Conditioner 1.5HP', sku: 'PAN-AC15', category: 'Air Conditioners', unit_price: 32500.00, current_stock: 8, available_stock: 7, reorder_point: 3, is_active: true, last_updated: '2024-08-12' },
  { id: 4, name: 'Whirlpool Microwave 25L', sku: 'WP-MW25', category: 'Kitchen Appliances', unit_price: 5990.00, current_stock: 20, available_stock: 17, reorder_point: 8, is_active: true, last_updated: '2024-08-14' },
  { id: 5, name: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', category: 'Kitchen Appliances', unit_price: 2490.00, current_stock: 0, available_stock: 0, reorder_point: 10, is_active: false, last_updated: '2024-07-20' },
]

validateMockData('inventory/item-update', mockProducts)
