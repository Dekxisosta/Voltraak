/**
 * Notification container that displays notifications as toast messages
 */

import React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'
import type { Notification } from '@/types'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
    title: 'text-green-800',
    text: 'text-green-700',
    button: 'text-green-500 hover:text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    button: 'text-red-500 hover:text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
    title: 'text-yellow-800',
    text: 'text-yellow-700',
    button: 'text-yellow-500 hover:text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700',
    button: 'text-blue-500 hover:text-blue-600',
  },
}

export default function NotificationContainer() {
  const { notifications, removeNotification, markAsRead } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-96 max-w-sm">
      {notifications.slice(0, 5).map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onRead={() => markAsRead(notification.id)}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onClose: () => void
  onRead: () => void
}

function NotificationItem({ notification, onClose, onRead }: NotificationItemProps) {
  const Icon = iconMap[notification.type]
  const colors = colorMap[notification.type]

  React.useEffect(() => {
    // Auto-mark as read after 3 seconds
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
        
        <div className="ml-3 flex-1">
          <h3 className={cn('text-sm font-medium', colors.title)}>
            {notification.title}
          </h3>
          
          <p className={cn('mt-1 text-sm', colors.text)}>
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
                    action.variant === 'primary' ? colors.button : 'text-gray-600 hover:text-gray-700'
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