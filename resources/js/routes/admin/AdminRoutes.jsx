/**
 * Admin route definitions
 *
 * A single route (/admin) renders AdminSection.
 * Admin-only — managers do not have access to these routes.
 */

import AdminSection from '@/pages/admin/AdminSection'

const ROLES = ['admin']

export const adminRoutes = [
  { path: '/admin', element: <AdminSection />, roles: ROLES },
]

export const adminLegacyRoutes = [
  { path: '/admin/work-queue', tab: 'work-queue', roles: ROLES },
  { path: '/admin/users', tab: 'users', roles: ROLES },
]
