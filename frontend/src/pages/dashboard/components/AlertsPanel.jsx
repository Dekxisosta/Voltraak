/**
 * Alerts panel showing critical notifications and warnings.
 *
 * Alerts are derived live from the same mock-store-backed resources the
 * role-specific pages themselves read (discrepancies, FEFO batches, picking
 * tasks, stock levels, expiry batches, damage reports, reservations, low
 * stock, PO approvals) — nothing here is hardcoded. Which resources get
 * subscribed to, and how they're turned into alerts, depends on the
 * logged-in user's role, so a warehouse worker, inventory staffer, and
 * manager each see alerts relevant to their own tabs. A mutation made on
 * any source page (e.g. resolving a discrepancy) updates this panel
 * immediately via the same subscribe() mechanism the dashboards use.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  Package,
  TrendingDown,
  ShoppingCart,
  ClipboardX,
  Ban,
} from 'lucide-react'
import { formatRelativeTime, formatCurrency } from '@/shared/utils'
import { useAuth } from '@/shared/contexts/AuthContext'
import { createResourceDataSource } from '@/shared/services/dataSource'

// One data source per resource, shared across every AlertsPanel instance —
// same pattern the dashboards use, so mutations elsewhere in the app are
// reflected here without a reload.
const discrepanciesSource = createResourceDataSource('warehouse/discrepancies')
const fefoSource = createResourceDataSource('warehouse/fefo')
const pickingSource = createResourceDataSource('warehouse/picking')

const stockLevelsSource = createResourceDataSource('inventory/stock-levels')
const expiryBatchesSource = createResourceDataSource('inventory/expiry-alerts')
const damageReportsSource = createResourceDataSource('inventory/damage-report')
const reservationsSource = createResourceDataSource('inventory/reservations')

const lowStockSource = createResourceDataSource('manager/low-stock')
const poApprovalsSource = createResourceDataSource('manager/po-approvals')

// Which resources each role's alerts are built from. Unrecognized roles
// (or no role yet) fall back to no subscriptions and an empty state.
const ROLE_SOURCES = {
  warehouse: {
    discrepancies: discrepanciesSource,
    fefo: fefoSource,
    picking: pickingSource,
  },
  inventory_staff: {
    stockLevels: stockLevelsSource,
    expiryBatches: expiryBatchesSource,
    damageReports: damageReportsSource,
    reservations: reservationsSource,
  },
  manager: {
    lowStock: lowStockSource,
    poApprovals: poApprovalsSource,
    discrepancies: discrepanciesSource,
  },
}

const alertTypeStyles = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/60',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
  },
  // Informational, not urgent - kept neutral so it doesn't compete with
  // the actual warning/critical alerts for attention.
  info: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    icon: 'text-gray-600 dark:text-gray-400',
    text: 'text-gray-800 dark:text-gray-300',
  },
}

/**
 * Builds warehouse-role alerts from discrepancies, FEFO recommendations,
 * and picking tasks — the same three resources WarehouseDashboard's stat
 * cards summarize.
 */
function buildWarehouseAlerts({ discrepancies = [], fefo = [], picking = [] }) {
  const alerts = []

  const openDiscrepancies = discrepancies.filter(
    (d) => d.status === 'open' || d.status === 'investigating'
  )
  const highPriority = openDiscrepancies.filter((d) => d.priority === 'high')
  if (highPriority.length > 0) {
    const worst = highPriority[0]
    alerts.push({
      id: `disc-${worst.id}`,
      type: 'critical',
      title: 'High-Priority Discrepancy',
      message: `${worst.report_number} — ${worst.product_name}: ${worst.variance > 0 ? '+' : ''}${worst.variance} units (${worst.discrepancy_type.replace(/_/g, ' ')})${highPriority.length > 1 ? `, +${highPriority.length - 1} more` : ''}`,
      timestamp: worst.created_at,
      icon: AlertTriangle,
      action: { label: 'Review', to: '/warehouse?tab=discrepancies' },
    })
  } else if (openDiscrepancies.length > 0) {
    alerts.push({
      id: 'disc-open',
      type: 'warning',
      title: 'Open Discrepancies',
      message: `${openDiscrepancies.length} count discrepanc${openDiscrepancies.length === 1 ? 'y needs' : 'ies need'} review`,
      timestamp: openDiscrepancies[0].created_at,
      icon: AlertTriangle,
      action: { label: 'Review', to: '/warehouse?tab=discrepancies' },
    })
  }

  const criticalFefo = fefo.filter((b) => b.urgency_level === 'critical')
  if (criticalFefo.length > 0) {
    const soonest = [...criticalFefo].sort((a, b) => a.days_until_expiry - b.days_until_expiry)[0]
    alerts.push({
      id: 'fefo-critical',
      type: 'critical',
      title: 'Batches Expiring Soon',
      message: `${criticalFefo.length} batch${criticalFefo.length > 1 ? 'es' : ''} need immediate action — most urgent: ${soonest.product_name} in ${soonest.days_until_expiry}d`,
      icon: Clock,
      action: { label: 'View FEFO', to: '/warehouse?tab=fefo' },
    })
  }

  const pendingHighPriorityPicks = picking.filter(
    (t) => t.priority === 'high' && t.status !== 'completed'
  )
  if (pendingHighPriorityPicks.length > 0) {
    alerts.push({
      id: 'picks-high',
      type: 'warning',
      title: 'High-Priority Picks Pending',
      message: `${pendingHighPriorityPicks.length} high-priority order${pendingHighPriorityPicks.length > 1 ? 's' : ''} awaiting picking`,
      icon: Package,
      action: { label: 'View Picking', to: '/warehouse?tab=picking' },
    })
  }

  return alerts
}

/**
 * Builds inventory-staff-role alerts from stock levels, expiry batches,
 * damage reports, and reservations — the same four resources
 * InventoryDashboard's stat cards summarize.
 */
function buildInventoryAlerts({
  stockLevels = [],
  expiryBatches = [],
  damageReports = [],
  reservations = [],
}) {
  const alerts = []

  const outOfStock = stockLevels.filter((s) => s.status === 'out_of_stock')
  if (outOfStock.length > 0) {
    alerts.push({
      id: 'stock-out',
      type: 'critical',
      title: 'Stock Out Alert',
      message: `${outOfStock[0].product_name}${outOfStock.length > 1 ? ` and ${outOfStock.length - 1} other item${outOfStock.length > 2 ? 's' : ''}` : ''} at zero stock`,
      icon: Package,
      action: { label: 'View Stock', to: '/inventory?tab=stock-levels' },
    })
  }

  const critical = stockLevels.filter((s) => s.status === 'critical')
  if (critical.length > 0) {
    alerts.push({
      id: 'stock-critical',
      type: 'warning',
      title: 'Low Stock Items',
      message: `${critical.length} product${critical.length > 1 ? 's' : ''} below reorder point`,
      icon: TrendingDown,
      action: { label: 'Review', to: '/inventory?tab=stock-levels' },
    })
  }

  const expired = expiryBatches.filter((b) => b.status === 'expired')
  if (expired.length > 0) {
    alerts.push({
      id: 'batch-expired',
      type: 'critical',
      title: 'Expired Batches',
      message: `${expired.length} batch${expired.length > 1 ? 'es' : ''} past expiry and still in stock`,
      icon: Ban,
      action: { label: 'View Batches', to: '/inventory?tab=expiry-alerts' },
    })
  }

  const expiringSoon = expiryBatches.filter((b) => b.status === 'warning')
  if (expiringSoon.length > 0) {
    const soonest = [...expiringSoon].sort((a, b) => a.days_to_expiry - b.days_to_expiry)[0]
    alerts.push({
      id: 'batch-warning',
      type: 'warning',
      title: 'Batch Expiring Soon',
      message: `${expiringSoon.length} batch${expiringSoon.length > 1 ? 'es' : ''} expiring soon — closest: ${soonest.product_name} in ${soonest.days_to_expiry}d`,
      icon: Clock,
      action: { label: 'View Batches', to: '/inventory?tab=expiry-alerts' },
    })
  }

  const pendingDamage = damageReports.filter((d) => d.status === 'pending_review')
  if (pendingDamage.length > 0) {
    alerts.push({
      id: 'damage-pending',
      type: 'info',
      title: 'Damage Reports Pending Review',
      message: `${pendingDamage.length} report${pendingDamage.length > 1 ? 's' : ''} awaiting review`,
      timestamp: pendingDamage[0].reported_at,
      icon: AlertTriangle,
      action: { label: 'Review', to: '/inventory?tab=damage-report' },
    })
  }

  const expiredReservations = reservations.filter((r) => r.status === 'expired')
  if (expiredReservations.length > 0) {
    alerts.push({
      id: 'reservations-expired',
      type: 'info',
      title: 'Expired Reservations',
      message: `${expiredReservations.length} reservation${expiredReservations.length > 1 ? 's' : ''} expired and can be released`,
      icon: ClipboardX,
      action: { label: 'Review', to: '/inventory?tab=reservations' },
    })
  }

  return alerts
}

/**
 * Builds manager-role alerts from low-stock alerts, pending PO approvals,
 * and open warehouse discrepancies (oversight) — mirroring what
 * ManagerDashboard's stat cards and quick redirects already surface.
 */
function buildManagerAlerts({ lowStock = [], poApprovals = [], discrepancies = [] }) {
  const alerts = []

  const outOfStock = lowStock.filter((s) => s.status === 'out_of_stock')
  const criticalLow = lowStock.filter((s) => s.status === 'critical')
  if (outOfStock.length > 0) {
    alerts.push({
      id: 'low-stock-out',
      type: 'critical',
      title: 'Products Out of Stock',
      message: `${outOfStock[0].product_name}${outOfStock.length > 1 ? ` and ${outOfStock.length - 1} other product${outOfStock.length > 2 ? 's' : ''}` : ''} need reordering now`,
      icon: Package,
      action: { label: 'View Low Stock', to: '/manager?tab=low-stock' },
    })
  }
  if (criticalLow.length > 0) {
    alerts.push({
      id: 'low-stock-critical',
      type: 'warning',
      title: 'Low Stock Items',
      message: `${criticalLow.length} product${criticalLow.length > 1 ? 's' : ''} critically low, at risk of stocking out soon`,
      icon: TrendingDown,
      action: { label: 'Review', to: '/manager?tab=low-stock' },
    })
  }

  const pendingPOs = poApprovals.filter((po) => po.status === 'pending')
  const highValuePending = pendingPOs.filter((po) => po.total_amount > 50000)
  if (highValuePending.length > 0) {
    const total = highValuePending.reduce((sum, po) => sum + po.total_amount, 0)
    alerts.push({
      id: 'po-high-value',
      type: 'warning',
      title: 'High-Value POs Awaiting Approval',
      message: `${highValuePending.length} purchase order${highValuePending.length > 1 ? 's' : ''} over ₱50,000 pending — ${formatCurrency(total)} total`,
      timestamp: highValuePending[0].requested_at,
      icon: ShoppingCart,
      action: { label: 'Review', to: '/manager?tab=po-approvals' },
    })
  } else if (pendingPOs.length > 0) {
    alerts.push({
      id: 'po-pending',
      type: 'info',
      title: 'Purchase Orders Awaiting Approval',
      message: `${pendingPOs.length} purchase order${pendingPOs.length > 1 ? 's' : ''} pending your review`,
      timestamp: pendingPOs[0].requested_at,
      icon: ShoppingCart,
      action: { label: 'Review', to: '/manager?tab=po-approvals' },
    })
  }

  const openHighPriorityDiscrepancies = discrepancies.filter(
    (d) => (d.status === 'open' || d.status === 'investigating') && d.priority === 'high'
  )
  if (openHighPriorityDiscrepancies.length > 0) {
    alerts.push({
      id: 'oversight-discrepancies',
      type: 'warning',
      title: 'High-Priority Discrepancies',
      message: `${openHighPriorityDiscrepancies.length} unresolved discrepanc${openHighPriorityDiscrepancies.length === 1 ? 'y' : 'ies'} flagged by warehouse staff`,
      icon: AlertTriangle,
      action: { label: 'View', to: '/warehouse?tab=discrepancies' },
    })
  }

  return alerts
}

const ALERT_BUILDERS = {
  warehouse: buildWarehouseAlerts,
  inventory_staff: buildInventoryAlerts,
  manager: buildManagerAlerts,
}

export default function AlertsPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role
  const sources = ROLE_SOURCES[role]

  const [resourceData, setResourceData] = useState({})

  useEffect(() => {
    setResourceData({})
    if (!sources) return undefined

    const unsubscribers = Object.entries(sources).map(([key, source]) =>
      source.subscribe((records) =>
        setResourceData((prev) => ({ ...prev, [key]: records }))
      )
    )

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [role, sources])

  const alerts = useMemo(() => {
    const builder = ALERT_BUILDERS[role]
    if (!builder) return []
    return builder(resourceData)
  }, [role, resourceData])

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Alerts</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {alerts.length} active
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onNavigate={navigate} />
            ))
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No alerts</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                All systems are running smoothly
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AlertItem({ alert, onNavigate }) {
  const styles = alertTypeStyles[alert.type]

  return (
    <div className={`rounded-lg border p-3 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start">
        <alert.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="ml-3 flex-1">
          <h4 className={`text-sm font-medium ${styles.text}`}>
            {alert.title}
          </h4>
          <p className={`mt-1 text-sm ${styles.text} opacity-90`}>
            {alert.message}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {alert.timestamp ? formatRelativeTime(alert.timestamp) : ''}
            </p>
            {alert.action && (
              <button
                onClick={() => onNavigate(alert.action.to)}
                className={`text-xs font-medium underline ${styles.icon} hover:opacity-75`}
              >
                {alert.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
