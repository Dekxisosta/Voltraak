/**
 * Mock data for Manager KPI Dashboard page
 * Shape must match the fields read by KPIDashboardPage.jsx:
 * metrics: { totalSKUs, stockValue, lowStockItems, shrinkageRate,
 *            inventoryAccuracy, turnoverRate, serviceLevel, fefoCompliance }
 * trends.stockValue: [{ period, value }]
 * categoryBreakdown: [{ category, value, color }]
 * alerts: [{ id, type, title, message }]
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
}

validateMockData('manager/kpi', mockKPIData)
