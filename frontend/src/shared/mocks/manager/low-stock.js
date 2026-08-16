/**
 * Mock data for Manager Low Stock page
 */

import { validateMockData } from '../validate'

export const mockLowStockAlerts = [
  { id: 1, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', current_stock: 3, reorder_point: 5, minimum_stock: 2, avg_daily_sales: 0.5, days_until_stockout: 6, status: 'critical', suggested_order_qty: 20 },
  { id: 2, product_name: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', current_stock: 0, reorder_point: 10, minimum_stock: 5, avg_daily_sales: 1.2, days_until_stockout: 0, status: 'out_of_stock', suggested_order_qty: 40 },
  { id: 3, product_name: 'Panasonic Iron 1600W', sku: 'PAN-IR16', current_stock: 4, reorder_point: 8, minimum_stock: 3, avg_daily_sales: 0.8, days_until_stockout: 5, status: 'critical', suggested_order_qty: 25 },
  { id: 4, product_name: 'Samsung TV 43"', sku: 'SAM-TV43', current_stock: 6, reorder_point: 8, minimum_stock: 4, avg_daily_sales: 0.3, days_until_stockout: 20, status: 'low', suggested_order_qty: 15 },
  { id: 5, product_name: 'Electrolux Blender 1.5L', sku: 'ELUX-BL15', current_stock: 7, reorder_point: 10, minimum_stock: 5, avg_daily_sales: 0.6, days_until_stockout: 12, status: 'low', suggested_order_qty: 18 },
  { id: 6, product_name: 'Whirlpool Dryer 7kg', sku: 'WP-DR7', current_stock: 1, reorder_point: 3, minimum_stock: 1, avg_daily_sales: 0.2, days_until_stockout: 5, status: 'critical', suggested_order_qty: 10 },
]

validateMockData('manager/low-stock', mockLowStockAlerts)
