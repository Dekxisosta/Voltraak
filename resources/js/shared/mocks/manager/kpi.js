/**
 * Mock data for Manager KPI Dashboard page
 * Shape must match the fields read by KPIDashboardPage.jsx:
 * metrics: { totalSKUs, stockValue, lowStockItems, shrinkageRate,
 *            inventoryAccuracy, turnoverRate, serviceLevel, fefoCompliance }
 * trends.stockValue: [{ period, value }]
 * categoryBreakdown: [{ category, value, color }]
 * alerts: [{ id, type, title, message }]
 * pendingApprovals: { count, totalValue, items: [{ id, poNumber, supplier, amount, priority }] }
 * movementSummary: { stockIn, stockOut, adjustments, netChange }
 * topMovers: [{ name, unitsSold, revenue }]
 * criticalStock: [{ id, productName, sku, status, daysUntilStockout }]
 */

import { validateMockData } from '../validate'

export const mockKPIData = {
  metrics: {
    totalSKUs: 150,
    stockValue: 2875430.00,
    lowStockItems: 12,
    shrinkageRate: 2.1,
    inventoryAccuracy: 97.2,
    turnoverRate: 8.2,
    serviceLevel: 96.5,
    fefoCompliance: 91.0,
  },
  trends: {
    stockValue: [
      { period: 'Mar 2024', value: 2450000 },
      { period: 'Apr 2024', value: 2510000 },
      { period: 'May 2024', value: 2600000 },
      { period: 'Jun 2024', value: 2705000 },
      { period: 'Jul 2024', value: 2790000 },
      { period: 'Aug 2024', value: 2875430 },
    ],
  },
  categoryBreakdown: [
    { category: 'Refrigerators', value: 32, color: '#3b82f6' },
    { category: 'Washing Machines', value: 21, color: '#22c55e' },
    { category: 'Air Conditioners', value: 18, color: '#f59e0b' },
    { category: 'Kitchen Appliances', value: 20, color: '#a855f7' },
    { category: 'Others', value: 9, color: '#94a3b8' },
  ],
  alerts: [
    { id: 1, type: 'critical', title: 'Low Stock: LG Washing Machine 8kg', message: 'Only 3 units left, below reorder point of 5' },
    { id: 2, type: 'warning', title: 'Expiring Batches', message: '2 batches expiring within 10 days require priority sale' },
  ],
  pendingApprovals: {
    count: 3,
    totalValue: 1549600,
    items: [
      { id: 1, poNumber: 'PO-2024-0045', supplier: 'Samsung Philippines', amount: 519800, priority: 'high' },
      { id: 3, poNumber: 'PO-2024-0044', supplier: 'Panasonic Distributor', amount: 650000, priority: 'high' },
      { id: 2, poNumber: 'PO-2024-0046', supplier: 'LG Electronics Manila', amount: 379800, priority: 'medium' },
    ],
  },
  movementSummary: {
    stockIn: 320,
    stockOut: 285,
    adjustments: 12,
    netChange: 23,
  },
  topMovers: [
    { name: 'Samsung Refrigerator 21cu', unitsSold: 45, revenue: 1169550 },
    { name: 'LG Washing Machine 8kg', unitsSold: 38, revenue: 721620 },
    { name: 'Panasonic AC 1.5HP', unitsSold: 22, revenue: 715000 },
    { name: 'Whirlpool Microwave 25L', unitsSold: 55, revenue: 329450 },
    { name: 'Sharp Rice Cooker 1.8L', unitsSold: 80, revenue: 199200 },
  ],
  criticalStock: [
    { id: 2, productName: 'Sharp Rice Cooker 1.8L', sku: 'SHRP-RC18', status: 'out_of_stock', daysUntilStockout: 0 },
    { id: 6, productName: 'Whirlpool Dryer 7kg', sku: 'WP-DR7', status: 'critical', daysUntilStockout: 5 },
    { id: 3, productName: 'Panasonic Iron 1600W', sku: 'PAN-IR16', status: 'critical', daysUntilStockout: 5 },
    { id: 1, productName: 'LG Washing Machine 8kg', sku: 'LG-WM8', status: 'critical', daysUntilStockout: 6 },
  ],
}

validateMockData('manager/kpi', mockKPIData)
