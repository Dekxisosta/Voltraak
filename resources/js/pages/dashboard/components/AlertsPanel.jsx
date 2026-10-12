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
  BellRing,
  CheckCircle2,
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
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')
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
    fefo: fefoSource,
    picking: pickingSource,
  },
  inventory_staff: {
    stockLevels: stockLevelsSource,
    expiryBatches: expiryBatchesSource,
    damageReports: damageReportsSource,
    reservations: reservationsSource,
    discrepancies: discrepanciesSource,
  },
  manager: {
    lowStock: lowStockSource,
    poApprovals: poApprovalsSource,
    discrepancies: discrepanciesSource,
  },
  // Admin can reach every section, so its alerts are the union of all
  // three role's sources above.
  admin: {
    fefo: fefoSource,
    picking: pickingSource,
    stockLevels: stockLevelsSource,
    expiryBatches: expiryBatchesSource,
    damageReports: damageReportsSource,
    reservations: reservationsSource,
    discrepancies: discrepanciesSource,
    lowStock: lowStockSource,
    poApprovals: poApprovalsSource,
  },
}


/**
 * Builds warehouse-role alerts from FEFO recommendations and picking
 * tasks — the same two resources WarehouseDashboard's stat cards
 * summarize. Discrepancies are no longer surfaced here: Warehouse only
 * raises a concern (see ReportDiscrepancyPage.jsx) and doesn't investigate
 * or track status, which is now Inventory's job.
 */
function buildWarehouseAlerts({ fefo = [], picking = [] }) {
  const alerts = []

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
 * damage reports, reservations, and discrepancies — the same resources
 * InventoryDashboard's stat cards summarize. Discrepancies moved here from
 * warehouse: Inventory investigates and resolves reports that Warehouse
 * raises.
 */
function buildInventoryAlerts({
  stockLevels = [],
  expiryBatches = [],
  damageReports = [],
  reservations = [],
  discrepancies = [],
}) {
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
      action: { label: 'Review', to: '/inventory?tab=discrepancies' },
    })
  } else if (openDiscrepancies.length > 0) {
    alerts.push({
      id: 'disc-open',
      type: 'warning',
      title: 'Open Discrepancies',
      message: `${openDiscrepancies.length} count discrepanc${openDiscrepancies.length === 1 ? 'y needs' : 'ies need'} review`,
      timestamp: openDiscrepancies[0].created_at,
      icon: AlertTriangle,
      action: { label: 'Review', to: '/inventory?tab=discrepancies' },
    })
  }

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
 * and open discrepancies (oversight, now owned by Inventory) plus any
 * discrepancies Inventory has sent up for write-off approval — mirroring
 * what ManagerDashboard's stat cards and quick redirects already surface.
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
      action: { label: 'View', to: '/inventory?tab=discrepancies' },
    })
  }

  const pendingWriteOffs = discrepancies.filter((d) => d.approval_status === 'pending')
  if (pendingWriteOffs.length > 0) {
    const totalValue = pendingWriteOffs.reduce((s, d) => s + (d.write_off_amount || 0), 0)
    alerts.push({
      id: 'pending-write-offs',
      type: 'warning',
      title: 'Write-offs Awaiting Approval',
      message: `${pendingWriteOffs.length} adjustment${pendingWriteOffs.length > 1 ? 's' : ''} pending — ${formatCurrency(totalValue)} total`,
      icon: ClipboardX,
      action: { label: 'Review', to: '/manager?tab=adjustment-approvals' },
    })
  }

  return alerts
}

/**
 * Admin sees the union of every role's alerts, since admin can reach
 * every section — this is what makes the app's alerting "showcase all
 * features" for that role.
 *
 * Alerts are sorted by the color hierarchy so critical items always
 * surface at the top, regardless of which role's builder produced them.
 */
const ALERT_SEVERITY = { critical: 0, warning: 1, info: 2 }

function buildAdminAlerts(data) {
  const all = [
    ...buildWarehouseAlerts(data),
    ...buildInventoryAlerts(data),
    ...buildManagerAlerts(data),
  ]
  return all.sort(
    (a, b) =>
      (ALERT_SEVERITY[a.type] ?? 3) - (ALERT_SEVERITY[b.type] ?? 3)
  )
}

const ALERT_BUILDERS = {
  warehouse: buildWarehouseAlerts,
  inventory_staff: buildInventoryAlerts,
  manager: buildManagerAlerts,
  admin: buildAdminAlerts,
}

export default function AlertsPanel({ hideHeader = false }) {
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

  const criticalCount = alerts.filter((a) => a.type === 'critical').length

  return (
    <div className="space-y-3">
      {/* Header — hidden when parent renders its own sticky header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] select-none">
              Alerts
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
                {criticalCount}
              </span>
            )}
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {alerts.length} active
            </span>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onNavigate={navigate} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-6 text-center"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-primary)',
          }}
        >
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'var(--color-accent-soft)' }}
          >
            <CheckCircle2 className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">All clear</p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">No active alerts</p>
        </div>
      )}
    </div>
  )
}

// ── Per-alert type config ──────────────────────────────────────────────────────

const ALERT_ACCENT = {
  critical: {
    bar: 'bg-red-500',
    iconBg: 'bg-red-500/10 dark:bg-red-500/15',
    iconColor: 'text-red-500 dark:text-red-400',
    label: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  warning: {
    bar: 'bg-amber-400',
    iconBg: 'bg-amber-400/10 dark:bg-amber-400/15',
    iconColor: 'text-amber-500 dark:text-amber-400',
    label: 'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  },
  info: {
    bar: 'bg-blue-500',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconColor: 'text-blue-500 dark:text-blue-400',
    label: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
}

function AlertItem({ alert, onNavigate }) {
  const acc = ALERT_ACCENT[alert.type] ?? ALERT_ACCENT.info

  return (
    <div
      className="relative flex gap-3 rounded-xl pl-3 pr-3 py-3 overflow-hidden transition-colors"
      style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${acc.bar}`} />

      {/* Icon */}
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${acc.iconBg}`}>
        <alert.icon className={`h-3.5 w-3.5 ${acc.iconColor}`} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold leading-snug text-[var(--color-text-primary)] truncate">
            {alert.title}
          </p>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${acc.label}`}>
            {alert.type}
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
          {alert.message}
        </p>

        <div className="flex items-center justify-between pt-0.5">
          {alert.timestamp ? (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {formatRelativeTime(alert.timestamp)}
            </span>
          ) : (
            <span />
          )}
          {alert.action && (
            <button
              onClick={() => onNavigate(alert.action.to)}
              className={`text-[11px] font-semibold ${acc.iconColor} hover:underline focus:outline-none focus-visible:underline`}
            >
              {alert.action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
