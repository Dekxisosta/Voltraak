/**
 * Task Detail Modal
 *
 * Shows full context for a single work-queue item and provides a
 * "Go to module" navigation link so the user can act on the task
 * directly in the originating workflow.
 *
 * Status can be updated from here without leaving the modal.
 */

import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Clock,
  Calendar,
  Tag,
  ArrowRight,
  CheckCircle,
  Circle,
  Loader,
  PauseCircle,
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, StatusBadge } from '@/shared/components/common'
import {
  TYPE_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  buildNavigationUrl,
} from '../workQueueService'
import { cn } from '@/utils'

// Maps task status → icon component
const STATUS_ICONS = {
  todo: Circle,
  in_progress: Loader,
  waiting: PauseCircle,
  completed: CheckCircle,
}

// Next logical status transitions per current status
const STATUS_TRANSITIONS = {
  todo: [
    { value: 'in_progress', label: 'Start Task' },
  ],
  in_progress: [
    { value: 'waiting', label: 'Mark Waiting' },
    { value: 'completed', label: 'Mark Complete' },
  ],
  waiting: [
    { value: 'in_progress', label: 'Resume Task' },
    { value: 'completed', label: 'Mark Complete' },
  ],
  completed: [
    { value: 'todo', label: 'Reopen' },
  ],
}

// ─── Metadata renderer ────────────────────────────────────────────────────
// Renders type-specific key/value pairs from item.metadata in a clean grid.

const METADATA_LABELS = {
  customer: 'Customer',
  route: 'Route',
  items_count: 'Items',
  items_picked: 'Picked',
  supplier: 'Supplier',
  amount: 'Amount',
  items_count_po: 'Items',
  requested_by: 'Requested By',
  po_status: 'PO Status',
  product: 'Product',
  variance: 'Variance',
  location: 'Location',
  write_off: 'Write-Off Value',
  write_off_amount: 'Write-Off Value',
  approval_status: 'Approval Status',
  qty_affected: 'Units Affected',
  batches_affected: 'Batches Affected',
  batches_at_risk: 'Batches at Risk',
  current_stock: 'Current Stock',
  sku: 'SKU',
  days_until_stockout: 'Days to Stockout',
  suggested_order: 'Suggested Order Qty',
  discrepancy_type: 'Type',
  trigger: 'Triggered By',
  po_number: 'PO Number',
  reservations_to_release: 'Reservations to Release',
}

function MetadataGrid({ metadata }) {
  if (!metadata || Object.keys(metadata).length === 0) return null

  const entries = Object.entries(metadata).filter(([, v]) => v != null)
  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {entries.map(([key, value]) => {
        const label = METADATA_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const display = typeof value === 'number' && key.includes('amount')
          ? `₱${value.toLocaleString()}`
          : typeof value === 'number' && key.includes('write_off')
          ? `₱${value.toLocaleString()}`
          : String(value)

        return (
          <div key={key}>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{display}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function TaskDetailModal({ task, isOpen, onClose, onStatusChange, updating }) {
  const navigate = useNavigate()

  if (!task) return null

  const typeConfig = TYPE_CONFIG[task.type] ?? { label: task.type, moduleLabel: 'Go to module' }
  const statusConfig = STATUS_CONFIG[task.status] ?? { label: task.status, variant: 'neutral' }
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? { label: task.priority, variant: 'neutral' }
  const transitions = STATUS_TRANSITIONS[task.status] ?? []
  const StatusIcon = STATUS_ICONS[task.status] ?? Circle
  const navUrl = buildNavigationUrl(task.navigate_to)

  const handleNavigate = () => {
    if (!navUrl) return
    onClose()
    navigate(navUrl)
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const isDueSoon = task.due_date && task.status !== 'completed'
    ? (new Date(task.due_date) - Date.now()) < 24 * 60 * 60 * 1000
    : false

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            'mt-0.5 flex-shrink-0 rounded-full p-1.5',
            task.status === 'completed'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : task.status === 'in_progress'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              : task.status === 'waiting'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          )}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] leading-snug truncate">
              {task.title}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)] break-words">
              {task.description}
            </p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">

          {/* ── Badges row ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant={statusConfig.variant} label={statusConfig.label} />
            <StatusBadge variant={priorityConfig.variant} label={`${priorityConfig.label} Priority`} />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]">
              <Tag className="h-3 w-3" />
              {typeConfig.label}
            </span>
            {task.ref_number && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]">
                Ref: {task.ref_number}
              </span>
            )}
          </div>

          {/* ── Dates ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]" />
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">Created</p>
                <p className="text-sm text-[var(--color-text-primary)]">{formatDate(task.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className={cn('h-4 w-4 mt-0.5 flex-shrink-0', isDueSoon ? 'text-red-500' : 'text-[var(--color-text-muted)]')} />
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">Due</p>
                <p className={cn('text-sm font-medium', isDueSoon ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-primary)]')}>
                  {task.due_date ? formatDate(task.due_date) : '—'}
                  {isDueSoon && <span className="ml-1 text-xs font-semibold">(overdue)</span>}
                </p>
              </div>
            </div>
          </div>

          {/* ── Task-specific metadata ──────────────────────────────── */}
          {task.metadata && Object.keys(task.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                Details
              </p>
              <MetadataGrid metadata={task.metadata} />
            </div>
          )}

          {/* ── Navigate to module ──────────────────────────────────── */}
          {navUrl && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleNavigate}
              onKeyDown={e => e.key === 'Enter' && handleNavigate()}
              className="group flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
                <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] truncate">
                  {typeConfig.moduleLabel}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-transform group-hover:translate-x-0.5" />
            </div>
          )}

        </div>
      </ModalBody>

      {/* ── Footer — status transitions ─────────────────────────────── */}
      {transitions.length > 0 && (
        <ModalFooter>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={onClose} disabled={updating}>
              Close
            </Button>
            {transitions.map(t => (
              <Button
                key={t.value}
                variant={t.value === 'completed' ? 'primary' : 'secondary'}
                loading={updating === t.value}
                disabled={!!updating}
                onClick={() => onStatusChange(task.id, t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </ModalFooter>
      )}

      {transitions.length === 0 && (
        <ModalFooter>
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </ModalFooter>
      )}
    </Modal>
  )
}
