/**
 * Manager route definitions
 */

import KPIDashboardPage from '@/pages/manager/kpi/KPIDashboardPage'
import ForecastPage from '@/pages/manager/forecast/ForecastPage'
import ReportsPage from '@/pages/manager/reports/ReportsPage'
import LowStockPage from '@/pages/manager/low-stock/LowStockPage'
import POApprovalsPage from '@/pages/manager/po-approvals/POApprovalsPage'
import UserManagementPage from '@/pages/manager/users/UserManagementPage'

export const managerRoutes = [
  { path: '/manager/kpi', element: <KPIDashboardPage />, roles: ['manager'] },
  { path: '/manager/forecast', element: <ForecastPage />, roles: ['manager'] },
  { path: '/manager/reports', element: <ReportsPage />, roles: ['manager'] },
  { path: '/manager/low-stock', element: <LowStockPage />, roles: ['manager'] },
  { path: '/manager/po-approvals', element: <POApprovalsPage />, roles: ['manager'] },
  { path: '/manager/users', element: <UserManagementPage />, roles: ['manager'] },
]
