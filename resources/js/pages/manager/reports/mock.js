/**
 * Mock data for Manager Reports pages
 */

export const mockReportData = {
  summary: {
    total_inventory_value: 2875430,
    total_skus: 150,
    total_units: 4520,
    avg_turnover_rate: 8.2,
  },
  category_breakdown: [
    { category: 'Refrigerators', value: 890000, units: 45, percentage: 31 },
    { category: 'Washing Machines', value: 620000, units: 38, percentage: 22 },
    { category: 'Air Conditioners', value: 580000, units: 22, percentage: 20 },
    { category: 'Kitchen Appliances', value: 420000, units: 120, percentage: 15 },
    { category: 'Others', value: 365430, units: 95, percentage: 12 },
  ],
  movement_summary: {
    total_stock_in: 320,
    total_stock_out: 285,
    total_adjustments: 12,
    net_change: 23,
  },
  top_movers: [
    { name: 'Samsung Refrigerator 21cu', units_sold: 45, revenue: 1169550 },
    { name: 'LG Washing Machine 8kg', units_sold: 38, revenue: 721620 },
    { name: 'Panasonic AC 1.5HP', units_sold: 22, revenue: 715000 },
    { name: 'Whirlpool Microwave 25L', units_sold: 55, revenue: 329450 },
    { name: 'Sharp Rice Cooker 1.8L', units_sold: 80, revenue: 199200 },
  ],
}