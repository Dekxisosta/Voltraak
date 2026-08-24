/**
 * Inventory Staff section
 * Routed at /inventory — the active sub-page is picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import StockInOutPage from './stock-in-out/StockInOutPage'
import StockLevelsPage from './stock-levels/StockLevelsPage'
import DamageReportPage from './damage-report/DamageReportPage'
import ItemUpdatePage from './item-update/ItemUpdatePage'
import ReservationsPage from './reservations/ReservationsPage'
import ExpiryAlertsPage from './expiry-alerts/ExpiryAlertsPage'

const TABS = {
  'stock-in-out': StockInOutPage,
  'stock-levels': StockLevelsPage,
  'damage-report': DamageReportPage,
  'item-update': ItemUpdatePage,
  reservations: ReservationsPage,
  'expiry-alerts': ExpiryAlertsPage,
}

export default function InventorySection() {
  return <TabbedSection basePath="/inventory" tabs={TABS} defaultTab="stock-in-out" />
}
