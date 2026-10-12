/**
 * Mock data for Manager KPI Dashboard page
 */

export const mockKPIData = {
  inventory_metrics: {
    total_skus: { current: 150, previous: 147, change_percent: 2.04 },
    stock_accuracy: { current: 97.2, previous: 94.8, change_percent: 2.53 },
    shrinkage_rate: { current: 2.1, previous: 5.7, change_percent: -63.16 },
  },
  financial_metrics: {
    inventory_value: { current: 2875430.00, previous: 2650000.00, change_percent: 8.51 },
    inventory_turnover: { current: 8.2, previous: 6.8, change_percent: 20.59 },
  },
  operational_metrics: {
    stockout_incidents: { current: 3, previous: 8, change_percent: -62.5 },
    expiry_writeoffs: { current: 1250.00, previous: 15000.00, change_percent: -91.67 },
  },
}