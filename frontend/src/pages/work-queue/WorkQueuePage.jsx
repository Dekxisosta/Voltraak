/**
 * Work Queue Page
 *
 * Role-specific operational hub. Aggregates actionable items from every
 * existing workflow (picking, receiving, PO approvals, discrepancies, etc.)
 * and presents them as a unified task list. Users can:
 *   - Filter by status, priority, and workflow type
 *   - Search by title, description, or reference number
 *   - Update task status inline (Start, Complete, etc.)
 *   - Open a detail modal with full context and a direct link to the
 *     originating module
 *
 * Adding a new workflow type: add items to the mock and a TYPE_CONFIG
 * entry in workQueueService.js — no changes needed here.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListTodo,
  AlertCircle,
  Clock,
  CheckCircle,
  PauseCircle,
  Loader,
  Circle,
  ChevronRight,
  Calendar,
  ExternalLink,
  Filter,
  RotateCcw,
} from 'lucide-react'
import {
  Card,
  StatusBadge,
  Button,
  SearchBar,
  LoadingSpinner,
} from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useAuth } from '@/shared/contexts/AuthContext'
import {
  listForRole,
  updateStatus,
  subscribe,
  summarise,
  TYPE_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  buildNavigationUrl,
} from './workQueueService'
import TaskDetailModal from './components/TaskDetailModal'
import { cn } from '@/utils'

// ─── Constants ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['all', 'todo', 'in_progress', 'waiting', 'completed']
const PRIORITY_OPTIONS = ['all', 'high', 'medium', 'low']

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Loader,
  waiting: PauseCircle,
  completed: CheckCircle,
}

const STATUS_ICON_CLASSES = {
  todo: 'text-gray-400 dark:text-gray-500',
  in_progress: 'text-amber-500 dark:text-amber-400',
  waiting: 'text-blue-500 dark:text-blue-400',
  completed: 'text-emerald-500 dark:text-emerald-400',
}

const PRIORITY_DOT_CLASSES = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-400',
}

// ─── Stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconClass, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left card card-body transition-all',
        active
          ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'hover:bg-[var(--color-accent-soft)]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-md bg-[var(--color-bg-tertiary)]', iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────

function TaskRow({ task, onOpen, onStatusChange, updating }) {
  const StatusIcon = STATUS_ICONS[task.status] ?? Circle
  const statusIconClass = STATUS_ICON_CLASSES[task.status] ?? 'text-gray-400'
  const typeConfig = TYPE_CONFIG[task.type] ?? { label: task.type }
  const statusConfig = STATUS_CONFIG[task.status] ?? { label: task.status, variant: 'neutral' }
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? { label: task.priority, variant: 'neutral' }

  const isDueSoon = task.due_date && task.status !== 'completed'
    ? (new Date(task.due_date) - Date.now()) < 24 * 60 * 60 * 1000
    : false

  const isUpdating = !!updating

  // Inline quick-action: one-click start for todo tasks
  const handleQuickStart = (e) => {
    e.stopPropagation()
    onStatusChange(task.id, 'in_progress')
  }

  const handleQuickComplete = (e) => {
    e.stopPropagation()
    onStatusChange(task.id, 'completed')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={e => e.key === 'Enter' && onOpen(task)}
      className={cn(
        'group flex items-start gap-3 px-4 py-3.5 border-b border-[var(--color-border-primary)] last:border-b-0',
        'hover:bg-[var(--color-accent-soft)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]',
        task.status === 'completed' && 'opacity-60'
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 flex-shrink-0">
        <StatusIcon className={cn('h-4 w-4', statusIconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
          <span className={cn(
            'text-sm font-medium text-[var(--color-text-primary)]',
            task.status === 'completed' && 'line-through'
          )}>
            {task.title}
          </span>

          {/* Priority dot */}
          <span className={cn('inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', PRIORITY_DOT_CLASSES[task.priority])} />

          {/* Type tag */}
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
            {typeConfig.label}
          </span>

          {/* Ref number */}
          {task.ref_number && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {task.ref_number}
            </span>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] truncate mb-1.5">
          {task.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge variant={statusConfig.variant} label={statusConfig.label} size="sm" />
          <StatusBadge variant={priorityConfig.variant} label={`${priorityConfig.label} Priority`} size="sm" />
          {task.due_date && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs',
              isDueSoon ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[var(--color-text-muted)]'
            )}>
              <Calendar className="h-3 w-3" />
              {isDueSoon ? 'Due soon' : new Date(task.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div
        className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {task.status === 'todo' && (
          <Button
            size="sm"
            variant="secondary"
            loading={isUpdating}
            disabled={isUpdating}
            onClick={handleQuickStart}
          >
            Start
          </Button>
        )}
        {task.status === 'in_progress' && (
          <Button
            size="sm"
            variant="primary"
            loading={isUpdating}
            disabled={isUpdating}
            onClick={handleQuickComplete}
          >
            Complete
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="p-4 rounded-full bg-[var(--color-bg-tertiary)] mb-4">
        <ListTodo className="h-8 w-8 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
        {hasFilters ? 'No tasks match your filters' : 'All caught up'}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
        {hasFilters
          ? 'Try adjusting your search or filter criteria.'
          : 'There are no pending tasks in your queue right now.'}
      </p>
      {hasFilters && (
        <Button variant="secondary" size="sm" icon={RotateCcw} className="mt-4" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function WorkQueuePage() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [updatingId, setUpdatingId] = useState(null) // id of item being status-updated
  const [showFilters, setShowFilters] = useState(false)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listForRole(user?.role)
      setItems(data)
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load work queue' })
    } finally {
      setLoading(false)
    }
  }, [user?.role, addNotification])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Live-sync with mock store mutations (e.g. status change from modal)
  useEffect(() => {
    const unsub = subscribe(() => loadItems())
    return unsub
  }, [loadItems])

  // ── Status update (shared between inline row buttons and modal) ──────────
  const handleStatusChange = useCallback(async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await updateStatus(id, newStatus)
      const statusLabel = STATUS_CONFIG[newStatus]?.label ?? newStatus
      addNotification({ type: 'success', title: 'Task updated', message: `Status set to "${statusLabel}"` })
      await loadItems()
      // Keep modal open but refresh its data
      if (selectedTask?.id === id) {
        setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to update task status' })
    } finally {
      setUpdatingId(null)
    }
  }, [addNotification, loadItems, selectedTask])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const availableTypes = [...new Set(items.map(i => i.type))].sort()

  const filtered = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false
    if (filterType !== 'all' && item.type !== filterType) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.ref_number && item.ref_number.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Sort: incomplete first (todo → in_progress → waiting), then by priority, then by created_at
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
  const STATUS_ORDER = { todo: 0, in_progress: 1, waiting: 2, completed: 3 }
  const sorted = [...filtered].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    }
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    }
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' || searchTerm

  const clearFilters = () => {
    setFilterStatus('all')
    setFilterPriority('all')
    setFilterType('all')
    setSearchTerm('')
  }

  const stats = summarise(items)

  // ── Stat cards click → filter by status ──────────────────────────────────
  const handleStatClick = (status) => {
    setFilterStatus(prev => prev === status ? 'all' : status)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading work queue..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Queue"
        subtitle="Your role-specific task list — aggregated from all active workflows"
        icon={ListTodo}
        actions={
          stats.high_priority > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.high_priority} high priority
            </span>
          )
        }
      />

      {/* ── Summary stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          icon={ListTodo}
          iconClass="text-gray-500"
          onClick={() => handleStatClick('all')}
          active={filterStatus === 'all'}
        />
        <StatCard
          label="To Do"
          value={stats.todo}
          icon={Circle}
          iconClass="text-gray-500"
          onClick={() => handleStatClick('todo')}
          active={filterStatus === 'todo'}
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress}
          icon={Loader}
          iconClass="text-amber-500"
          onClick={() => handleStatClick('in_progress')}
          active={filterStatus === 'in_progress'}
        />
        <StatCard
          label="Waiting"
          value={stats.waiting}
          icon={PauseCircle}
          iconClass="text-blue-500"
          onClick={() => handleStatClick('waiting')}
          active={filterStatus === 'waiting'}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle}
          iconClass="text-emerald-500"
          onClick={() => handleStatClick('completed')}
          active={filterStatus === 'completed'}
        />
      </div>

      {/* ── Task list ─────────────────────────────────────────────── */}
      <Card>
        <Card.Body>

          {/* Search + filter bar */}
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search tasks, references..."
              className="w-full sm:max-w-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pills */}
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full transition-colors capitalize whitespace-nowrap',
                    filterStatus === s
                      ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-secondary)]'
                  )}
                >
                  {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}

              {/* More filters toggle */}
              <button
                onClick={() => setShowFilters(f => !f)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors',
                  showFilters || filterPriority !== 'all' || filterType !== 'all'
                    ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-secondary)]'
                )}
              >
                <Filter className="h-3 w-3" />
                Filters
                {(filterPriority !== 'all' || filterType !== 'all') && (
                  <span className="ml-0.5 bg-white/30 dark:bg-black/30 rounded-full px-1">
                    {[filterPriority !== 'all', filterType !== 'all'].filter(Boolean).length}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-[var(--color-border-primary)]">
              {/* Priority */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">Priority:</span>
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full transition-colors capitalize',
                      filterPriority === p
                        ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-secondary)]'
                    )}
                  >
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {/* Type */}
              {availableTypes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">Type:</span>
                  <button
                    onClick={() => setFilterType('all')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full transition-colors',
                      filterType === 'all'
                        ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-secondary)]'
                    )}
                  >
                    All
                  </button>
                  {availableTypes.map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full transition-colors',
                        filterType === t
                          ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-secondary)]'
                      )}
                    >
                      {TYPE_CONFIG[t]?.label ?? t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Result count */}
          {hasActiveFilters && sorted.length > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Showing {sorted.length} of {items.length} task{items.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Task rows */}
          {sorted.length === 0 ? (
            <EmptyState hasFilters={!!hasActiveFilters} onClear={clearFilters} />
          ) : (
            <div className="divide-y-0">
              {sorted.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onOpen={setSelectedTask}
                  onStatusChange={handleStatusChange}
                  updating={updatingId === task.id}
                />
              ))}
            </div>
          )}

        </Card.Body>
      </Card>

      {/* ── Task detail modal ─────────────────────────────────────── */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusChange}
        updating={updatingId && selectedTask?.id === updatingId
          ? /* which button is loading */ items.find(i => i.id === updatingId)?.status !== selectedTask?.status
            ? selectedTask?.status
            : null
          : null
        }
      />
    </div>
  )
}
