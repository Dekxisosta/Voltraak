/**
 * Manager section
 * Routed at /manager — the active sub-page is picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import KPIDashboardPage from './kpi/KPIDashboardPage'
import ForecastPage from './forecast/ForecastPage'
import ReportsPage from './reports/ReportsPage'
import LowStockPage from './low-stock/LowStockPage'
import POApprovalsPage from './po-approvals/POApprovalsPage'
import UserManagementPage from './users/UserManagementPage'
import AdjustmentApprovalsPage from './adjustment-approvals/AdjustmentApprovalsPage'

const TABS = {
  kpi: KPIDashboardPage,
  forecast: ForecastPage,
  reports: ReportsPage,
  'low-stock': LowStockPage,
  'po-approvals': POApprovalsPage,
  'adjustment-approvals': AdjustmentApprovalsPage,
  users: UserManagementPage,
}

export default function ManagerSection() {
  return <TabbedSection basePath="/manager" tabs={TABS} defaultTab="kpi" />
}