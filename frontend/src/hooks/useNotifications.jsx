/**
 * Notifications hook and provider
 * Manages application-wide notifications and alerts
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { generateId } from '@/utils'
import type { Notification, NotificationAction } from '@/types'

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  
  // Convenience methods
  showSuccess: (title: string, message: string, actions?: NotificationAction[]) => string
  showError: (title: string, message: string, actions?: NotificationAction[]) => string
  showWarning: (title: string, message: string, actions?: NotificationAction[]) => string
  showInfo: (title: string, message: string, actions?: NotificationAction[]) => string
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: React.ReactNode
  maxNotifications?: number
  autoRemoveDelay?: number
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 10,
  autoRemoveDelay = 5000 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Add notification
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ): string => {
    const id = generateId()
    const newNotification: Notification = {
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

    // Auto-remove non-error notifications after delay
    if (notification.type !== 'error' && autoRemoveDelay > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, autoRemoveDelay)
    }

    return id
  }, [maxNotifications, autoRemoveDelay])

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(current => current.filter(n => n.id !== id))
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(current =>
      current.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // Mark all notifications as read
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
  const showSuccess = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showError = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showWarning = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const showInfo = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      actions,
    })
  }, [addNotification])

  const value: NotificationContextType = {
    notifications,
    addNotification,
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

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Hook for handling async operations with notifications
export function useAsyncOperation() {
  const { showSuccess, showError, showInfo } = useNotifications()

  const executeWithNotification = useCallback(async <T,>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string
      successMessage?: string
      errorMessage?: string
      showSuccess?: boolean
    } = {}
  ): Promise<T> => {
    const {
      loadingMessage,
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed',
      showSuccess: shouldShowSuccess = true,
    } = options

    let loadingId: string | undefined

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

  const showValidationErrors = useCallback((errors: Record<string, string>) => {
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

  const showFormSuccess = useCallback((message: string = 'Form submitted successfully') => {
    showSuccess('Success', message)
  }, [showSuccess])

  return {
    showValidationErrors,
    showFormSuccess,
  }
}