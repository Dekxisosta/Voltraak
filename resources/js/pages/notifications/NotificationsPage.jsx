/**
 * NotificationsPage
 *
 * Full-page view of all notifications with:
 *  - Type filter tabs (All / Unread / Success / Warning / Error / Info)
 *  - Per-item mark-read and remove actions
 *  - Bulk "Mark all read" and "Clear all" actions
 *  - Paginated list (10 per page)
 */

import React, { useState, useMemo } from 'react'
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { Pagination } from '@/components/common'
import { cn } from '@/utils'
import { formatRelativeTime } from '@/shared/utils'

// ── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const FILTER_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'unread',  label: 'Unread' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error',   label: 'Error' },
  { key: 'info',    label: 'Info' },
]

const iconMap = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const colorMap = {
  success: {
    accent:  'bg-status-ok',
    icon:    'text-status-ok',
    iconBg:  'bg-status-ok/10',
    tab:     'text-status-ok border-status-ok',
    badge:   'bg-status-ok/10 text-status-ok',
  },
  error: {
    accent:  'bg-status-critical',
    icon:    'text-status-critical',
    iconBg:  'bg-status-critical/10',
    tab:     'text-status-critical border-status-critical',
    badge:   'bg-status-critical/10 text-status-critical',
  },
  warning: {
    accent:  'bg-status-warning',
    icon:    'text-status-warning',
    iconBg:  'bg-status-warning/10',
    tab:     'text-status-warning border-status-warning',
    badge:   'bg-status-warning/10 text-status-warning',
  },
  info: {
    accent:  'bg-status-neutral',
    icon:    'text-status-neutral',
    iconBg:  'bg-status-neutral/10',
    tab:     'text-status-neutral border-status-neutral',
    badge:   'bg-status-neutral/10 text-status-neutral',
  },
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications()

  const [activeFilter, setActiveFilter] = useState('all')
  const [currentPage, setCurrentPage]   = useState(1)

  // When the filter changes reset to page 1
  const handleFilterChange = (key) => {
    setActiveFilter(key)
    setCurrentPage(1)
  }

  // ── Filtered list ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeFilter === 'all')    return notifications
    if (activeFilter === 'unread') return notifications.filter((n) => !n.read)
    return notifications.filter((n) => n.type === activeFilter)
  }, [notifications, activeFilter])

  // ── Pagination ──────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(currentPage, totalPages)
  const pageItems   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Tab counts ──────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:     notifications.length,
    unread:  notifications.filter((n) => !n.read).length,
    success: notifications.filter((n) => n.type === 'success').length,
    warning: notifications.filter((n) => n.type === 'warning').length,
    error:   notifications.filter((n) => n.type === 'error').length,
    info:    notifications.filter((n) => n.type === 'info').length,
  }), [notifications])

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)]">
            <Bell className="h-5 w-5 text-[var(--color-text-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => { clearAll(); setCurrentPage(1) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-soft)] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide"
        style={{ background: 'var(--color-glass-card)', border: '1px solid var(--color-glass-border)' }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0',
              activeFilter === tab.key
                ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            )}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold leading-none',
                  activeFilter === tab.key
                    ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                )}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--color-glass-border)', background: 'var(--color-glass-card)' }}
      >
        {pageItems.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <ul className="divide-y divide-[var(--color-glass-border)]">
            {pageItems.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={() => markAsRead(n.id)}
                onRemove={() => {
                  removeNotification(n.id)
                  // If we just removed the last item on this page, step back
                  if (pageItems.length === 1 && safePage > 1) {
                    setCurrentPage((p) => p - 1)
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-[var(--color-text-muted)]">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            showFirstLast={false}
            showInfo={false}
          />
        </div>
      )}

    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────

function NotificationRow({ notification: n, onRead, onRemove }) {
  const Icon   = iconMap[n.type]  || Info
  const colors = colorMap[n.type] || colorMap.info

  return (
    <li
      className={cn(
        'group relative flex items-start gap-4 px-5 py-4 transition-colors cursor-default',
        'hover:bg-[var(--color-bg-tertiary)]',
        !n.read && 'bg-[var(--color-accent)]/5',
      )}
      onClick={() => { if (!n.read) onRead() }}
    >
      {/* Unread indicator strip */}
      <span
        className={cn(
          'absolute left-0 inset-y-0 w-0.5 rounded-r transition-opacity',
          colors.accent,
          n.read ? 'opacity-0' : 'opacity-100',
        )}
      />

      {/* Type icon */}
      <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', colors.iconBg)}>
        <Icon className={cn('h-4 w-4', colors.icon)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm leading-snug break-words',
            n.read ? 'text-[var(--color-text-secondary)]' : 'font-semibold text-[var(--color-text-primary)]',
          )}>
            {n.title}
          </p>
          {/* Type badge */}
          <span className={cn(
            'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
            colors.badge,
          )}>
            {n.type}
          </span>
        </div>

        {n.message && (
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)] break-words">
            {n.message}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {formatRelativeTime(n.timestamp)}
          </span>
          {!n.read && (
            <button
              onClick={(e) => { e.stopPropagation(); onRead() }}
              className="text-[11px] font-medium text-[var(--color-accent)] hover:underline"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>

      {/* Remove button — appears on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        title="Remove"
        className="mt-0.5 shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ filter }) {
  const messages = {
    all:     { title: 'All caught up',       sub: 'You have no notifications.' },
    unread:  { title: 'Nothing unread',       sub: 'All notifications have been read.' },
    success: { title: 'No success notices',   sub: 'No success notifications yet.' },
    warning: { title: 'No warnings',          sub: 'No warning notifications yet.' },
    error:   { title: 'No errors',            sub: 'No error notifications yet.' },
    info:    { title: 'No info notices',      sub: 'No info notifications yet.' },
  }
  const { title, sub } = messages[filter] || messages.all

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
        <BellOff className="h-7 w-7 text-[var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{sub}</p>
    </div>
  )
}
