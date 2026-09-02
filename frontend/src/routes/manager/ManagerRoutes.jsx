/**
 * Manager route definitions
 *
 * A single route (/manager) renders ManagerSection, which switches between
 * sub-pages via ?tab=. legacyRoutes below keep old bookmarked paths like
 * /manager/kpi working by redirecting to /manager?tab=kpi.
 */

import ManagerSection from '@/pages/manager/ManagerSection'

// Admin is the "sees everything" role, used to showcase every section
// of the app — it's included alongside manager on every route group.
const ROLES = ['manager', 'admin']

export const managerRoutes = [
  { path: '/manager', element: <ManagerSection />, roles: ROLES },
]

export const managerLegacyRoutes = [
  { path: '/manager/kpi', tab: 'kpi', roles: ROLES },
  { path: '/manager/forecast', tab: 'forecast', roles: ROLES },
  { path: '/manager/reports', tab: 'reports', roles: ROLES },
  { path: '/manager/low-stock', tab: 'low-stock', roles: ROLES },
  { path: '/manager/po-approvals', tab: 'po-approvals', roles: ROLES },
  { path: '/manager/adjustment-approvals', tab: 'adjustment-approvals', roles: ROLES },
  { path: '/manager/users', tab: 'users', roles: ROLES },
]
