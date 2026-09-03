/**
 * Notifications hook and provider
 * Manages application-wide notifications and alerts
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { generateId } from '@/utils'

const STORAGE_KEY = 'voltraak_notifications'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // Corrupted storage — fall through to seeds
  }
  return null
}

function saveToStorage(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  } catch {
    // Storage quota exceeded or private-browsing restriction — silently ignore
  }
}


const NotificationContext = createContext(undefined)

// ── Demo seed data so the panel is never empty on first load ────────────
function buildSeedNotifications() {
  const now = Date.now()
  return [
    {
      id: 'seed-1',
      type: 'warning',
      title: 'Low stock alert',
      message: 'SKU-4821 (Lithium Cell Pack) has dropped below the reorder threshold.',
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),   // 2 min ago
      read: false,
      silent: true,
    },
    {
      id: 'seed-2',
      type: 'success',
      title: 'PO-2041 approved',
      message: 'Purchase order for 500 units of EV Connector Type-2 has been approved.',
      timestamp: new Date(now - 18 * 60 * 1000).toISOString(),  // 18 min ago
      read: false,
      silent: true,
    },
    {
      id: 'seed-3',
      type: 'info',
      title: 'Inventory sync complete',
      message: 'Warehouse B stock levels have been synchronised with the central inventory.',
      timestamp: new Date(now - 47 * 60 * 1000).toISOString(),  // 47 min ago
      read: false,
      silent: true,
    },
    {
      id: 'seed-4',
      type: 'error',
      title: 'Shipment discrepancy',
      message: 'Inbound shipment SHP-9903 has 12 unmatched items. Review required.',
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hr ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-5',
      type: 'info',
      title: 'Batch expiry in 7 days',
      message: 'Batch BAT-0317 (Polyurethane Foam) expires on ' +
        new Date(now + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() + '.',
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hr ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-6',
      type: 'success',
      title: 'Stock adjustment approved',
      message: 'ADJ-0088 — +200 units of Copper Bus Bar have been added to stock.',
      timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hr ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-7',
      type: 'warning',
      title: 'Picking list overdue',
      message: 'Picking list PL-5512 for Order ORD-1177 is 2 hours past its target time.',
      timestamp: new Date(now - 7 * 60 * 60 * 1000).toISOString(), // 7 hr ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-8',
      type: 'info',
      title: 'User account created',
      message: 'New warehouse operator account created for J. Nakamura.',
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-9',
      type: 'success',
      title: 'Monthly report ready',
      message: 'The inventory variance report for last month is ready for download.',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      read: true,
      silent: true,
    },
    {
      id: 'seed-10',
      type: 'warning',
      title: 'High-value item movement',
      message: 'SKU-7710 (Battery Module 100kWh) was moved to external storage without sign-off.',
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      read: true,
      silent: true,
    },
  ]
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 100,
}) {
  // Hydrate from localStorage on mount; fall back to seed data on first visit.
  const [notifications, setNotifications] = useState(() => loadFromStorage() ?? buildSeedNotifications())

  // Mirror every state change to localStorage so it survives page reloads.
  useEffect(() => {
    saveToStorage(notifications)
  }, [notifications])

  // Add notification
  // Note: auto-dismissal (10s) and its exit animation are handled by
  // NotificationItem itself, not here - that keeps the "how long is this
  // on screen" timing next to the component that actually animates it out,
  // and avoids a race between two independent removal timers.
  const addNotification = useCallback((notification) => {
    const id = generateId()
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    }

    setNotifications(current => {
      const updated = [newNotification, ...current]
      
      // Limit the number of notifications
      if (updated.length > maxNotifications) {
        return updated.slice(0, maxNotifications)
      }
      
      return updated
    })

    return id
  }, [maxNotifications])

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(current => current.filter(n => n.id !== id))
  }, [])

  // Mark notification
  const markAsRead = useCallback((id) => {
    setNotifications(current =>
      current.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // Mark all notifications
  const markAllAsRead = useCallback(() => {
    setNotifications(current =>
      current.map(n => ({ ...n, read: true }))
    )
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, actions) => {
    return addNotification({
      type: 'success',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showError = useCallback((title, message, actions) => {
    return addNotification({
      type: 'error',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showWarning = useCallback((title, message, actions) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showInfo = useCallback((title, message, actions) => {
    return addNotification({
      type: 'info',
      title,
      message,
      actions,
    })
  }, [addNotification])

  // Derived: count of unread items — memoised so consumers only re-render when it changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const value = {
    notifications,
    unreadCount,
    addNotification,
    showNotification: addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Hook for handling async operations with notifications
export function useAsyncOperation() {
  const { showSuccess, showError, showInfo } = useNotifications()

  const executeWithNotification = useCallback(async (operation, options = {}) => {
    const {
      loadingMessage,
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed',
      showSuccess: shouldShowSuccess = true,
    } = options

    let loadingId

    try {
      // Show loading notification if message provided
      if (loadingMessage) {
        loadingId = showInfo('Processing...', loadingMessage)
      }

      // Execute the operation
      const result = await operation()

      // Remove loading notification
      if (loadingId) {
        // Note: removeNotification would be available if we return it from context
        // For now, we'll let it auto-remove
      }

      // Show success notification
      if (shouldShowSuccess) {
        showSuccess('Success', successMessage)
      }

      return result
    } catch (error) {
      // Remove loading notification
      if (loadingId) {
        // Note: removeNotification would be available if we return it from context
      }

      // Show error notification
      const message = error instanceof Error ? error.message : errorMessage
      showError('Error', message)

      throw error
    }
  }, [showSuccess, showError, showInfo])

  return { executeWithNotification }
}

// Hook for form validation notifications
export function useFormNotifications() {
  const { showError, showSuccess } = useNotifications()

  const showValidationErrors = useCallback((errors) => {
    const errorMessages = Object.values(errors)
    if (errorMessages.length > 0) {
      showError(
        'Validation Error',
        errorMessages.length === 1 
          ? errorMessages[0] 
          : `Please fix ${errorMessages.length} validation errors`
      )
    }
  }, [showError])

  const showFormSuccess = useCallback((message = 'Form submitted successfully') => {
    showSuccess('Success', message)
  }, [showSuccess])

  return {
    showValidationErrors,
    showFormSuccess,
  }
}