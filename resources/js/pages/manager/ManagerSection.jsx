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
import AdjustmentApprovalsPage from './adjustment-approvals/AdjustmentApprovalsPage'
import WorkQueuePage from '@/pages/work-queue/WorkQueuePage'

const TABS = {
  'work-queue': WorkQueuePage,
  kpi: KPIDashboardPage,
  forecast: ForecastPage,
  reports: ReportsPage,
  'low-stock': LowStockPage,
  'po-approvals': POApprovalsPage,
  'adjustment-approvals': AdjustmentApprovalsPage,
}

export default function ManagerSection() {
  return <TabbedSection basePath="/manager" tabs={TABS} defaultTab="kpi" />
}