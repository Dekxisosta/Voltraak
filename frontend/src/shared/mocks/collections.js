/**
 * Mock collection registry
 *
 * Maps every mutable resource to its seed dataset, keyed by the same
 * strings used in shared/mocks/schema.js. mockStore.js reads this registry
 * once per collection to seed the persisted store on first access.
 *
 * Only array-shaped, record-based resources are registered here — object
 * shaped mocks like auth/me, manager/kpi, and manager/reports are read-only
 * aggregates with no individual records to mutate, so they stay on the
 * plain fetchData() path in dataSource.js.
 *
 * Adding a new mutable resource: create the mock file as usual (default
 * export style is unaffected), then add one line here.
 */

import { mockFEFORecommendations } from './warehouse/fefo'
import { mockPickingTasks } from './warehouse/picking'
import { mockPurchaseOrders as mockReceivingPOs } from './warehouse/receiving'

import { mockUsers } from './manager/users'
import { mockPurchaseOrders as mockManagerPOs } from './manager/po-approvals'
import { mockForecasts } from './manager/forecast'
import { mockLowStockAlerts } from './manager/low-stock'

import { mockDiscrepancies } from './inventory/discrepancies'
import { mockDamageReports } from './inventory/damage-report'
import { mockProducts } from './inventory/item-update'
import { mockReservations } from './inventory/reservations'
import { mockStockLevels } from './inventory/stock-levels'
import { mockStockTransactions } from './inventory/stock-in-out'
import { mockExpiryBatches } from './inventory/expiry-alerts'

export const SEED_COLLECTIONS = {
  'warehouse/fefo': mockFEFORecommendations,
  'warehouse/picking': mockPickingTasks,
  'warehouse/receiving': mockReceivingPOs,

  'manager/users': mockUsers,
  'manager/po-approvals': mockManagerPOs,
  'manager/forecast': mockForecasts,
  'manager/low-stock': mockLowStockAlerts,

  'inventory/discrepancies': mockDiscrepancies,
  'inventory/damage-report': mockDamageReports,
  'inventory/item-update': mockProducts,
  'inventory/reservations': mockReservations,
  'inventory/stock-levels': mockStockLevels,
  'inventory/stock-in-out': mockStockTransactions,
  'inventory/expiry-alerts': mockExpiryBatches,
}

export function isRegisteredCollection(key) {
  return Object.prototype.hasOwnProperty.call(SEED_COLLECTIONS, key)
}
