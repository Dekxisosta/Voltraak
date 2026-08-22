/**
 * Mock data for Manager Forecast page
 */

import { validateMockData } from '../validate'

export const mockForecasts = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', current_stock: 15, avg_weekly_demand: 3.2, forecast_demand_8w: 26, reorder_point: 5, suggested_order: 16, trend: 'up', confidence: 92 },
  { id: 2, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', current_stock: 3, avg_weekly_demand: 2.1, forecast_demand_8w: 17, reorder_point: 5, suggested_order: 19, trend: 'stable', confidence: 88 },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', sku: 'PAN-AC15', current_stock: 8, avg_weekly_demand: 4.5, forecast_demand_8w: 36, reorder_point: 9, suggested_order: 37, trend: 'up', confidence: 85 },
  { id: 4, product_name: 'Whirlpool Microwave 25L', sku: 'WP-MW25', current_stock: 20, avg_weekly_demand: 1.5, forecast_demand_8w: 12, reorder_point: 8, suggested_order: 0, trend: 'down', confidence: 90 },
  { id: 5, product_name: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', current_stock: 0, avg_weekly_demand: 3.8, forecast_demand_8w: 30, reorder_point: 10, suggested_order: 40, trend: 'up', confidence: 87 },
  { id: 6, product_name: 'Electrolux Vacuum Cleaner', sku: 'ELUX-VC', current_stock: 12, avg_weekly_demand: 1.2, forecast_demand_8w: 10, reorder_point: 4, suggested_order: 2, trend: 'stable', confidence: 91 },
]

validateMockData('manager/forecast', mockForecasts)
