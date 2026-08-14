/**
 * Warehouse Staff route definitions
 */

import { Route } from 'react-router-dom'
import ReceivingPage from '@/pages/warehouse/receiving/ReceivingPage'
import PickingPage from '@/pages/warehouse/picking/PickingPage'
import FEFOPage from '@/pages/warehouse/fefo/FEFOPage'
import DiscrepanciesPage from '@/pages/warehouse/discrepancies/DiscrepanciesPage'

export const warehouseRoutes = [
  { path: '/warehouse/receiving', element: <ReceivingPage />, roles: ['warehouse', 'manager'] },
  { path: '/warehouse/picking', element: <PickingPage />, roles: ['warehouse', 'manager'] },
  { path: '/warehouse/fefo', element: <FEFOPage />, roles: ['warehouse', 'manager'] },
  { path: '/warehouse/discrepancies', element: <DiscrepanciesPage />, roles: ['warehouse', 'manager'] },
]
