/**
 * Notifications hook and provider
 * Manages application-wide notifications and alerts
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { generateId } from '@/utils'


const NotificationContext = createContext(undefined)



export function NotificationProvider({ 
  children, 
  maxNotifications = 10,
}) {
  const [notifications, setNotifications] = useState([])

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

  const value = {
    notifications,
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