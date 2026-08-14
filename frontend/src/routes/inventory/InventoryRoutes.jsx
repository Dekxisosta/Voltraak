/**
 * Inventory Staff route definitions
 */

import StockInOutPage from '@/pages/inventory/stock-in-out/StockInOutPage'
import StockLevelsPage from '@/pages/inventory/stock-levels/StockLevelsPage'
import DamageReportPage from '@/pages/inventory/damage-report/DamageReportPage'
import ItemUpdatePage from '@/pages/inventory/item-update/ItemUpdatePage'
import ReservationsPage from '@/pages/inventory/reservations/ReservationsPage'
import ExpiryAlertsPage from '@/pages/inventory/expiry-alerts/ExpiryAlertsPage'

export const inventoryRoutes = [
  { path: '/inventory/stock-in-out', element: <StockInOutPage />, roles: ['inventory_staff', 'manager'] },
  { path: '/inventory/stock-levels', element: <StockLevelsPage />, roles: ['inventory_staff', 'manager'] },
  { path: '/inventory/damage-report', element: <DamageReportPage />, roles: ['inventory_staff', 'manager'] },
  { path: '/inventory/item-update', element: <ItemUpdatePage />, roles: ['inventory_staff', 'manager'] },
  { path: '/inventory/reservations', element: <ReservationsPage />, roles: ['inventory_staff', 'manager'] },
  { path: '/inventory/expiry-alerts', element: <ExpiryAlertsPage />, roles: ['inventory_staff', 'manager'] },
]