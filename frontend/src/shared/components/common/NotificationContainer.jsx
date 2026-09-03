/**
 * Notification container that displays notifications messages
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'

// How long a toast stays on screen before it auto-dismisses.
const AUTO_DISMISS_MS = 5000
// Must match the 'toast-out' animation duration in tailwind.config.js so the
// notification is only unmounted once the exit animation has finished.
const EXIT_ANIMATION_MS = 200

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

// Colors are pulled from the app's semantic `status` palette (see
// tailwind.config.js) so a toast reads the same as every other status
// indicator in the product, rather than introducing its own one-off
// color scale. Surfaces/text/borders use the themed CSS variable tokens
// so toasts stay correct in both light and dark mode automatically.
const colorMap = {
  success: {
    accent: 'bg-status-ok',
    iconBg: 'bg-status-ok/10',
    icon: 'text-status-ok',
    action: 'text-status-ok hover:text-status-ok/80',
  },
  error: {
    accent: 'bg-status-critical',
    iconBg: 'bg-status-critical/10',
    icon: 'text-status-critical',
    action: 'text-status-critical hover:text-status-critical/80',
  },
  warning: {
    accent: 'bg-status-warning',
    iconBg: 'bg-status-warning/10',
    icon: 'text-status-warning',
    action: 'text-status-warning hover:text-status-warning/80',
  },
  // Plain notices, not a status - kept neutral so it doesn't compete with
  // the genuine success/warning/error toasts.
  info: {
    accent: 'bg-status-neutral',
    iconBg: 'bg-status-neutral/10',
    icon: 'text-status-neutral',
    action: 'text-status-neutral hover:text-status-neutral/80',
  },
}

export default function NotificationContainer() {
  const { notifications, removeNotification, markAsRead } = useNotifications()

  // Silent notifications (e.g. seed data loaded on login) are stored in
  // the panel and counted in the badge but never shown as pop-up toasts.
  const toastQueue = notifications.filter((n) => !n.silent)

  if (toastQueue.length === 0) {
    return null
  }

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex w-96 max-w-sm flex-col">
      {toastQueue.slice(0, 3).map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onRead={() => markAsRead(notification.id)}
        />
      ))}
    </div>,
    document.body
  )
}



function NotificationItem({ notification, onClose, onRead }) {
  const Icon = iconMap[notification.type]
  const colors = colorMap[notification.type]
  const [isExiting, setIsExiting] = React.useState(false)
  // Errors stay pinned until the user dismisses them - they don't
  // auto-dismiss like the other toast types.
  const isPinned = notification.type === 'error'

  // Kick off the exit animation, then hand off to the parent to actually
  // drop the notification from state once the animation has played out.
  const handleClose = React.useCallback(() => {
    setIsExiting((exiting) => {
      if (exiting) return exiting
      setTimeout(onClose, EXIT_ANIMATION_MS)
      return true
    })
  }, [onClose])

  React.useEffect(() => {
    // Auto-mark after 2.5 seconds
    const readTimer = setTimeout(() => {
      if (!notification.read) {
        onRead()
      }
    }, 2500)

    // Auto-dismiss after 10 seconds (errors are pinned and skip this)
    const dismissTimer = isPinned ? null : setTimeout(handleClose, AUTO_DISMISS_MS)

    return () => {
      clearTimeout(readTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.read, onRead, isPinned])

  return (
    <div
      className={cn(
        'relative mb-2 overflow-hidden rounded-lg border p-4 pl-5 shadow-lg',
        'border-[var(--color-border-primary)] bg-[var(--color-surface-card)]',
        isExiting ? 'animate-toast-out' : 'animate-toast-in',
        notification.read && !isExiting ? 'opacity-80' : 'opacity-100'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Status accent strip */}
      <span className={cn('absolute inset-y-0 left-0 w-1', colors.accent)} />

      <div className="flex items-start">
        <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', colors.iconBg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>

        <div className="ml-3 flex-1 min-w-0">
          <h3 className="text-sm font-semibold break-words text-[var(--color-text-primary)]">
            {notification.title}
          </h3>

          <p className="mt-1 text-sm break-words text-[var(--color-text-secondary)]">
            {notification.message}
          </p>

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action()
                    handleClose()
                  }}
                  className={cn(
                    'text-sm font-medium underline transition-colors',
                    action.variant === 'primary' ? colors.action : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="ml-4 flex-shrink-0 rounded-md p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ '--tw-ring-color': 'var(--color-accent)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
