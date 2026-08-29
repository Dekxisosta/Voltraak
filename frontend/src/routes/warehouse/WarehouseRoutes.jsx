/**
 * Warehouse Staff route definitions
 *
 * A single route (/warehouse) renders WarehouseSection, which switches
 * between sub-pages via ?tab=. legacyRoutes below keep old bookmarked
 * paths like /warehouse/picking working by redirecting to
 * /warehouse?tab=picking.
 */

import WarehouseSection from '@/pages/warehouse/WarehouseSection'

const ROLES = ['warehouse', 'manager']

export const warehouseRoutes = [
  { path: '/warehouse', element: <WarehouseSection />, roles: ROLES },
]

export const warehouseLegacyRoutes = [
  { path: '/warehouse/receiving', tab: 'receiving', roles: ROLES },
  { path: '/warehouse/picking', tab: 'picking', roles: ROLES },
  { path: '/warehouse/fefo', tab: 'fefo', roles: ROLES },
  { path: '/warehouse/discrepancies', tab: 'discrepancies', roles: ROLES },
]
