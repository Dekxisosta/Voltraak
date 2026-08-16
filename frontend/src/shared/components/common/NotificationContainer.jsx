/**
 * Notification container that displays notifications messages
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500 dark:text-green-400',
    title: 'text-green-800 dark:text-green-300',
    text: 'text-green-700 dark:text-green-400',
    button: 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500 dark:text-red-400',
    title: 'text-red-800 dark:text-red-300',
    text: 'text-red-700 dark:text-red-400',
    button: 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500 dark:text-yellow-400',
    title: 'text-yellow-800 dark:text-yellow-300',
    text: 'text-yellow-700 dark:text-yellow-400',
    button: 'text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-400',
    button: 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-400',
  },
}

export default function NotificationContainer() {
  const { notifications, removeNotification, markAsRead } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  // Portaled so this toast stack always mounts as the last element of
  // <body>, keeping its stacking order predictable relative to other
  // fixed z-indexed UI (modals, sidebar) no matter where in the tree
  // NotificationContainer itself is rendered from.
  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 w-96 max-w-sm">
      {notifications.slice(0, 5).map((notification) => (
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

  React.useEffect(() => {
    // Auto-mark after 3 seconds
    const timer = setTimeout(() => {
      if (!notification.read) {
        onRead()
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [notification.read, onRead])

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-lg transition-all duration-200 animate-slide-in',
        colors.bg,
        colors.border,
        notification.read ? 'opacity-75' : 'opacity-100'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', colors.icon)} />
        
        <div className="ml-3 flex-1 min-w-0">
          <h3 className={cn('text-sm font-medium break-words', colors.title)}>
            {notification.title}
          </h3>
          
          <p className={cn('mt-1 text-sm break-words', colors.text)}>
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
                    onClose()
                  }}
                  className={cn(
                    'text-sm font-medium underline',
                    action.variant === 'primary' ? colors.button : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
          onClick={onClose}
          className={cn(
            'ml-4 flex-shrink-0 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
            colors.button
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}