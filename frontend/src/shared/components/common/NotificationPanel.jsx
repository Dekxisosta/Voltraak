/**
 * NotificationPanel
 *
 * A dropdown anchored below the bell icon in the Header. It shows the
 * in-memory notification history (all records, including toast-dismissed
 * ones) with per-item read/dismiss actions, a "Mark all read" button,
 * a "Clear all" button, and a "See all notifications" footer link that
 * navigates to the full /notifications page.
 *
 * Positioning:
 *  - Desktop: absolute dropdown, right-aligned to the bell button.
 *  - Mobile: fixed full-width panel pinned to the top so it never
 *    overflows off-screen.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'
import { formatRelativeTime } from '@/shared/utils'

// ── Icon / colour maps (mirrors NotificationContainer) ──────────────────
const iconMap = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const colorMap = {
  success: { accent: 'bg-status-ok',       icon: 'text-status-ok',       iconBg: 'bg-status-ok/10'       },
  error:   { accent: 'bg-status-critical',  icon: 'text-status-critical',  iconBg: 'bg-status-critical/10' },
  warning: { accent: 'bg-status-warning',   icon: 'text-status-warning',   iconBg: 'bg-status-warning/10'  },
  info:    { accent: 'bg-status-neutral',   icon: 'text-status-neutral',   iconBg: 'bg-status-neutral/10'  },
}

// ── Main panel ───────────────────────────────────────────────────────────
export default function NotificationPanel({ isOpen, onClose, anchorRef }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications()

  const navigate = useNavigate()
  const panelRef = React.useRef(null)

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Close on outside click — but ignore clicks on the anchor button itself
  // (the parent toggles `isOpen`, so we'd double-fire otherwise).
  React.useEffect(() => {
    if (!isOpen) return
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        if (anchorRef?.current && anchorRef.current.contains(e.target)) return
        onClose()
      }
    }
    // Slight delay so the bell's own click handler fires first.
    const id = setTimeout(() => document.addEventListener('mousedown', onClick), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onClick)
    }
  }, [isOpen, onClose, anchorRef])

  const handleSeeAll = () => {
    onClose()
    navigate('/notifications')
  }

  if (!isOpen) return null

  // Show at most 8 items in the dropdown; the full page shows everything.
  const preview = notifications.slice(0, 8)
  const isEmpty = notifications.length === 0

  return createPortal(
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[79] sm:hidden bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel ───────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        className={cn(
          'fixed z-[80] flex flex-col overflow-hidden',
          'border border-[var(--color-glass-border)] shadow-[var(--shadow-glass)]',
          'animate-fade-in',
          // Mobile: full-width strip just below the header
          'top-14 left-2 right-2 rounded-xl max-h-[85vh]',
          // Desktop: anchored dropdown on the right
          'sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[520px]',
        )}
        style={{
          background:           'var(--color-glass-popover)',
          backdropFilter:       'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-glass-border)] shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                title="Clear all"
                className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Notification list ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isEmpty ? (
            <EmptyState />
          ) : (
            <ul>
              {preview.map((n, i) => (
                <React.Fragment key={n.id}>
                  <NotificationRow
                    notification={n}
                    onRead={() => markAsRead(n.id)}
                    onRemove={() => removeNotification(n.id)}
                  />
                  {i < preview.length - 1 && (
                    <li className="border-b border-[var(--color-glass-border)] mx-4" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
              {notifications.length > 8 && (
                <li className="px-4 py-2 text-center text-xs text-[var(--color-text-muted)]">
                  +{notifications.length - 8} more — see all below
                </li>
              )}
            </ul>
          )}
        </div>

        {/* ── Footer — See all ─────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[var(--color-glass-border)]">
          <button
            onClick={handleSeeAll}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            See all notifications
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Row item ──────────────────────────────────────────────────────────────
function NotificationRow({ notification: n, onRead, onRemove }) {
  const Icon   = iconMap[n.type]  || Info
  const colors = colorMap[n.type] || colorMap.info

  const handleRead = () => {
    if (!n.read) onRead()
  }

  return (
    <li
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-default',
        'hover:bg-[var(--color-bg-tertiary)]',
        !n.read && 'bg-[var(--color-accent)]/5',
      )}
      onClick={handleRead}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
      )}

      {/* Icon */}
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', colors.iconBg)}>
        <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug break-words', n.read ? 'text-[var(--color-text-secondary)]' : 'font-medium text-[var(--color-text-primary)]')}>
          {n.title}
        </p>
        {n.message && (
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)] break-words line-clamp-2">
            {n.message}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
          {formatRelativeTime(n.timestamp)}
        </p>
      </div>

      {/* Remove button — visible on row hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        title="Remove"
        className="mt-0.5 shrink-0 p-1 rounded text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
        <BellOff className="h-6 w-6 text-[var(--color-text-muted)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">All caught up</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">No notifications yet</p>
      </div>
    </div>
  )
}
