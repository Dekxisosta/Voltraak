/**
 * Mock data for Inventory Stock Levels page
 * Shape must match the fields read by StockLevelsPage.jsx columns/filters:
 * id, product_name, product_sku, category, location, current_stock,
 * available_stock, reserved_stock, minimum_stock, reorder_point,
 * maximum_stock, status, total_value, turnover_rate, last_restock_date
 */

import { validateMockData } from '../validate'

export const mockStockLevels = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', product_sku: 'SAMSUNG-RF21', category: 'Refrigerators', location: 'A-01-03', current_stock: 15, available_stock: 12, reserved_stock: 3, minimum_stock: 5, reorder_point: 8, maximum_stock: 30, status: 'ok', total_value: 228000, turnover_rate: 3.4, last_restock_date: '2024-08-01' },
  { id: 2, product_name: 'LG Washing Machine 8kg', product_sku: 'LG-WM8', category: 'Washing Machines', location: 'B-02-01', current_stock: 3, available_stock: 3, reserved_stock: 0, minimum_stock: 5, reorder_point: 5, maximum_stock: 20, status: 'critical', total_value: 45000, turnover_rate: 1.8, last_restock_date: '2024-07-18' },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', product_sku: 'PAN-AC15', category: 'Air Conditioners', location: 'C-01-02', current_stock: 8, available_stock: 7, reserved_stock: 1, minimum_stock: 3, reorder_point: 4, maximum_stock: 15, status: 'ok', total_value: 91000, turnover_rate: 2.9, last_restock_date: '2024-08-05' },
  { id: 4, product_name: 'Whirlpool Microwave 25L', product_sku: 'WP-MW25', category: 'Kitchen Appliances', location: 'D-03-01', current_stock: 20, available_stock: 17, reserved_stock: 3, minimum_stock: 8, reorder_point: 10, maximum_stock: 40, status: 'ok', total_value: 54000, turnover_rate: 4.1, last_restock_date: '2024-08-10' },
  { id: 5, product_name: 'Sharp Rice Cooker 1.8L', product_sku: 'SHRP-RC18', category: 'Kitchen Appliances', location: 'A-02-04', current_stock: 0, available_stock: 0, reserved_stock: 0, minimum_stock: 10, reorder_point: 12, maximum_stock: 50, status: 'out_of_stock', total_value: 0, turnover_rate: 0.5, last_restock_date: '2024-06-22' },
  { id: 6, product_name: 'Electrolux Vacuum Cleaner', product_sku: 'ELUX-VC', category: 'Others', location: 'E-01-01', current_stock: 12, available_stock: 12, reserved_stock: 0, minimum_stock: 4, reorder_point: 4, maximum_stock: 20, status: 'ok', total_value: 18000, turnover_rate: 2.2, last_restock_date: '2024-07-30' },
]

validateMockData('inventory/stock-levels', mockStockLevels)
