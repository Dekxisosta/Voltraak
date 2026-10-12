/**
 * Warehouse Staff section
 * Routed at /warehouse — the active sub-page is picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import ReceivingPage from './receiving/ReceivingPage'
import PickingPage from './picking/PickingPage'
import FEFOPage from './fefo/FEFOPage'
import ReportDiscrepancyPage from './report-discrepancy/ReportDiscrepancyPage'
import WorkQueuePage from '@/pages/work-queue/WorkQueuePage'

const TABS = {
  'work-queue': WorkQueuePage,
  receiving: ReceivingPage,
  picking: PickingPage,
  fefo: FEFOPage,
  'report-discrepancy': ReportDiscrepancyPage,
}

export default function WarehouseSection() {
  return <TabbedSection basePath="/warehouse" tabs={TABS} defaultTab="picking" />
}
