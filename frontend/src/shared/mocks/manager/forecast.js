/**
 * Mock data for Manager Forecast page
 */

import { validateMockData } from '../validate'

export const mockForecasts = [
  { id: 1, product_name: 'Samsung Refrigerator 21cu', sku: 'SAMSUNG-RF21', category: 'Refrigerators', current_stock: 15, avg_weekly_demand: 3.2, forecast_demand_8w: 26, reorder_point: 5, suggested_order: 16, unit_cost: 23000, trend: 'up', confidence: 92 },
  { id: 2, product_name: 'LG Washing Machine 8kg', sku: 'LG-WM8', category: 'Washing Machines', current_stock: 3, avg_weekly_demand: 2.1, forecast_demand_8w: 17, reorder_point: 5, suggested_order: 19, unit_cost: 17500, trend: 'stable', confidence: 88 },
  { id: 3, product_name: 'Panasonic Air Conditioner 1.5HP', sku: 'PAN-AC15', category: 'Air Conditioners', current_stock: 8, avg_weekly_demand: 4.5, forecast_demand_8w: 36, reorder_point: 9, suggested_order: 37, unit_cost: 29000, trend: 'up', confidence: 85 },
  { id: 4, product_name: 'Whirlpool Microwave 25L', sku: 'WP-MW25', category: 'Kitchen Appliances', current_stock: 20, avg_weekly_demand: 1.5, forecast_demand_8w: 12, reorder_point: 8, suggested_order: 0, unit_cost: 5500, trend: 'down', confidence: 90 },
  { id: 5, product_name: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', category: 'Kitchen Appliances', current_stock: 0, avg_weekly_demand: 3.8, forecast_demand_8w: 30, reorder_point: 10, suggested_order: 40, unit_cost: 2200, trend: 'up', confidence: 87 },
  { id: 6, product_name: 'Electrolux Vacuum Cleaner', sku: 'ELUX-VC', category: 'Others', current_stock: 12, avg_weekly_demand: 1.2, forecast_demand_8w: 10, reorder_point: 4, suggested_order: 2, unit_cost: 3200, trend: 'stable', confidence: 91 },
]

validateMockData('manager/forecast', mockForecasts)

/**
 * Combined weekly demand across all forecasted SKUs.
 * 8 weeks of actual history is always shown; the forward forecast window
 * depends on the selected timeframe (4 / 8 / 12 weeks).
 * The two series share the boundary point (W-1) so the chart line reads
 * as one continuous trend rather than a break between "actual" and "forecast".
 */
const demandTrendBase = [
  { period: 'W-8', actual: 11 },
  { period: 'W-7', actual: 12 },
  { period: 'W-6', actual: 12 },
  { period: 'W-5', actual: 13 },
  { period: 'W-4', actual: 14 },
  { period: 'W-3', actual: 13 },
  { period: 'W-2', actual: 15 },
  { period: 'W-1', actual: 16, forecast: 16 },
  { period: 'W+1',  forecast: 14 },
  { period: 'W+2',  forecast: 15 },
  { period: 'W+3',  forecast: 16 },
  { period: 'W+4',  forecast: 17 },
  { period: 'W+5',  forecast: 18 },
  { period: 'W+6',  forecast: 17 },
  { period: 'W+7',  forecast: 17 },
  { period: 'W+8',  forecast: 17 },
  { period: 'W+9',  forecast: 16 },
  { period: 'W+10', forecast: 16 },
  { period: 'W+11', forecast: 15 },
  { period: 'W+12', forecast: 15 },
]

/** Returns the trend series trimmed to the requested forward window. */
export function getDemandTrend(timeframe = '8w') {
  const weeks = parseInt(timeframe, 10) // 4, 8, or 12
  // Keep all 8 actual history points plus the boundary (W-1) plus `weeks` forecast points
  const actualRows = demandTrendBase.filter(r => r.actual != null)
  const forecastRows = demandTrendBase.filter(r => r.actual == null).slice(0, weeks)
  return [...actualRows, ...forecastRows]
}

// Default export kept for backwards compatibility
export const mockDemandTrend = getDemandTrend('8w')

validateMockData('manager/forecast-trend', mockDemandTrend)
