/**
 * Inventory Staff route definitions
 *
 * A single route (/inventory) renders InventorySection, which switches
 * between sub-pages via ?tab=. legacyRoutes below keep old bookmarked
 * paths like /inventory/stock-levels working by redirecting to
 * /inventory?tab=stock-levels.
 */

import InventorySection from '@/pages/inventory/InventorySection'

const ROLES = ['inventory_staff', 'manager']

export const inventoryRoutes = [
  { path: '/inventory', element: <InventorySection />, roles: ROLES },
]

export const inventoryLegacyRoutes = [
  { path: '/inventory/stock-in-out', tab: 'stock-in-out', roles: ROLES },
  { path: '/inventory/stock-levels', tab: 'stock-levels', roles: ROLES },
  { path: '/inventory/damage-report', tab: 'damage-report', roles: ROLES },
  { path: '/inventory/item-update', tab: 'item-update', roles: ROLES },
  { path: '/inventory/reservations', tab: 'reservations', roles: ROLES },
  { path: '/inventory/expiry-alerts', tab: 'expiry-alerts', roles: ROLES },
  { path: '/inventory/discrepancies', tab: 'discrepancies', roles: ROLES },
]
