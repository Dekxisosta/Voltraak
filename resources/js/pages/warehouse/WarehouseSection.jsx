/**
 * Warehouse Staff section
 * Routed at /warehouse — the active sub-page is picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import ReceivingPage from './receiving/ReceivingPage'
import PickingPage from './picking/PickingPage'
import FEFOPage from './fefo/FEFOPage'
import ReportDiscrepancyPage from './report-discrepancy/ReportDiscrepancyPage'

const TABS = {
  receiving: ReceivingPage,
  picking: PickingPage,
  fefo: FEFOPage,
  'report-discrepancy': ReportDiscrepancyPage,
}

export default function WarehouseSection() {
  return <TabbedSection basePath="/warehouse" tabs={TABS} defaultTab="picking" />
}
