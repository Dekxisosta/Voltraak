/**
 * Work Queue Service
 *
 * Central data-access layer for the Work Queue module. All reads and
 * writes go through createResourceDataSource('work-queue') so that:
 *   - Mutations persist to localStorage in mock mode (same as every other module).
 *   - Switching to a real API only requires passing { api: workQueueApi }.
 *   - Pages stay decoupled from mock internals.
 *
 * Role filtering
 * ──────────────
 * The raw collection stores items for all roles. listForRole(role) applies
 * the role gate so each user only sees their own queue. Admin gets a merged
 * view of all roles.
 *
 * Adding new workflow types
 * ─────────────────────────
 * 1. Add mock items to shared/mocks/work-queue.js with the new `type` string.
 * 2. Add a TYPE_CONFIG entry below (icon, label, navigate_to resolver).
 * 3. No structural changes to the page or service are needed.
 */

import { createResourceDataSource } from '@/shared/services/dataSource'

// TODO: pass { api: workQueueApi } once the endpoint exists
const workQueueSource = createResourceDataSource('work-queue')

// ─── Type configuration ───────────────────────────────────────────────────
// Maps every `type` value to display metadata. Used by the page and modal
// to render icons, labels, and navigate-to links without switch statements
// scattered across components.

export const TYPE_CONFIG = {
  picking: {
    label: 'Picking',
    moduleLabel: 'Go to Picking Lists',
    color: 'blue',
  },
  receiving: {
    label: 'Receiving',
    moduleLabel: 'Go to Receiving',
    color: 'indigo',
  },
  discrepancy_report: {
    label: 'Discrepancy Report',
    moduleLabel: 'Go to Report Discrepancy',
    color: 'amber',
  },
  fefo: {
    label: 'FEFO Management',
    moduleLabel: 'Go to FEFO Management',
    color: 'orange',
  },
  discrepancy_review: {
    label: 'Discrepancy Review',
    moduleLabel: 'Go to Discrepancies',
    color: 'amber',
  },
  damage_report: {
    label: 'Damage Report',
    moduleLabel: 'Go to Damage Reports',
    color: 'red',
  },
  expiry_alert: {
    label: 'Expiry Alert',
    moduleLabel: 'Go to Expiry Alerts',
    color: 'orange',
  },
  stock_adjustment: {
    label: 'Stock Adjustment',
    moduleLabel: 'Go to Stock In/Out',
    color: 'teal',
  },
  reservation: {
    label: 'Reservation',
    moduleLabel: 'Go to Reservations',
    color: 'purple',
  },
  po_approval: {
    label: 'PO Approval',
    moduleLabel: 'Go to PO Approvals',
    color: 'green',
  },
  adjustment_approval: {
    label: 'Adjustment Approval',
    moduleLabel: 'Go to Adjustment Approvals',
    color: 'teal',
  },
  low_stock: {
    label: 'Low Stock',
    moduleLabel: 'Go to Low Stock Alerts',
    color: 'red',
  },
}

// ─── Status config ────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  todo: { label: 'To Do', variant: 'neutral' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  waiting: { label: 'Waiting', variant: 'warning' },
  completed: { label: 'Completed', variant: 'ok' },
}

// ─── Priority config ──────────────────────────────────────────────────────

export const PRIORITY_CONFIG = {
  high: { label: 'High', variant: 'critical' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'neutral' },
}

// ─── Role → visible roles mapping ────────────────────────────────────────
// Admin sees every role's items merged into one queue.

function getRolesForUser(role) {
  if (role === 'admin') return ['warehouse', 'inventory_staff', 'manager']
  return [role]
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * List all work-queue items visible to the given role.
 * Admin receives the full cross-role view.
 */
export async function listForRole(role) {
  const all = await workQueueSource.list()
  const visibleRoles = getRolesForUser(role)
  return all.filter(item => visibleRoles.includes(item.role))
}

/**
 * Update the status of a single work-queue item.
 */
export async function updateStatus(id, status) {
  return workQueueSource.update(id, {
    status,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Subscribe to live updates (mock mode only — real API should poll or use SSE).
 * Returns an unsubscribe function.
 */
export function subscribe(listener) {
  return workQueueSource.subscribe(listener)
}

/**
 * Build the URL string for navigating to the source module.
 * Appends ?tab= and optionally ?highlight= query params.
 */
export function buildNavigationUrl({ path, tab, highlightId } = {}) {
  if (!path) return null
  const params = new URLSearchParams()
  if (tab) params.set('tab', tab)
  if (highlightId != null) params.set('highlight', String(highlightId))
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * Derive summary counts from a list of items (already filtered by role).
 * Used by the stats bar at the top of WorkQueuePage.
 */
export function summarise(items) {
  return {
    total: items.length,
    todo: items.filter(i => i.status === 'todo').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    waiting: items.filter(i => i.status === 'waiting').length,
    completed: items.filter(i => i.status === 'completed').length,
    high_priority: items.filter(i => i.priority === 'high' && i.status !== 'completed').length,
  }
}
