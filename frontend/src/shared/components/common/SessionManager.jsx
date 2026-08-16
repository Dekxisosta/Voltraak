/**
 * Session management component for displaying session status and handling extensions
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'



export default function SessionManager({
  showInHeader = true,
  showWarningDialog = true,
  autoShowWarning = true
}) {
  const { 
    isAuthenticated, 
    getTimeUntilExpiry, 
    isSessionExpiringSoon, 
    extendSession,
    logout 
  } = useAuth()
  const { showNotification } = useNotifications()

  const [timeRemaining, setTimeRemaining] = useState(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isExtending, setIsExtending] = useState(false)

  // Update time remaining every second
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry()
      setTimeRemaining(remaining)

      // Show warning modal if session is expiring soon and auto-show is enabled
      if (autoShowWarning && showWarningDialog && isSessionExpiringSoon() && remaining !== null && remaining > 0) {
        setShowWarningModal(true)
      }

      // If session has expired, the AuthContext will handle logout
      if (remaining === 0) {
        setShowWarningModal(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, getTimeUntilExpiry, isSessionExpiringSoon, autoShowWarning, showWarningDialog])

  // Format time remaining
  const formatTimeRemaining = useCallback((milliseconds) => {
    if (milliseconds === null) return '--'

    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }, [])

  // Handle session extension
  const handleExtendSession = useCallback(async () => {
    try {
      setIsExtending(true)
      await extendSession()
      setShowWarningModal(false)
      
      showNotification({
        type: 'success',
        title: 'Session Extended',
        message: 'Your session has been extended successfully.'
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Extension Failed',
        message: 'Failed to extend session. You may need to log in again.'
      })
    } finally {
      setIsExtending(false)
    }
  }, [extendSession, showNotification])

  // Handle logout
  const handleLogout = useCallback(() => {
    setShowWarningModal(false)
    logout()
  }, [logout])

  // Don't render if not authenticated
  if (!isAuthenticated) return null

  // Get status color based on time remaining
  const getStatusColor = (time) => {
    if (time === null) return 'text-gray-500 dark:text-gray-400'
    
    const minutes = time / (60 * 1000)
    if (minutes <= 5) return 'text-red-600 dark:text-red-400'
    if (minutes <= 15) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  // Get status icon
  const getStatusIcon = (time) => {
    if (time === null) return <Clock className="w-4 h-4" />
    
    const minutes = time / (60 * 1000)
    if (minutes <= 5) return <AlertTriangle className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }

  return (
    <>
      {/* Header status indicator */}
      {showInHeader && (
        <div className="flex items-center space-x-2 text-sm">
          <span className={getStatusColor(timeRemaining)}>
            {getStatusIcon(timeRemaining)}
          </span>
          <span className={`font-medium ${getStatusColor(timeRemaining)}`}>
            {formatTimeRemaining(timeRemaining)}
          </span>
          
          {/* Quick extend button for expiring sessions */}
          {isSessionExpiringSoon() && (
            <button
              onClick={handleExtendSession}
              disabled={isExtending}
              className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Extend session"
            >
              <RefreshCw 
                className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${isExtending ? 'animate-spin' : ''}`} 
              />
            </button>
          )}
        </div>
      )}

      {/* Session expiry warning modal — portaled to <body> and given the
          same top-level z-[100] as other true modals, since this is
          mounted inside Header and would otherwise lose the stacking
          tie-break against components mounted later in the DOM. */}
      {showWarningDialog && showWarningModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 border-b">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Session Expiring Soon
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your session will expire in {formatTimeRemaining(timeRemaining)}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your session is about to expire. Would you like to extend it or log out now?
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time remaining:
                  </span>
                  <span className={`text-sm font-bold ${getStatusColor(timeRemaining)}`}>
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 p-6 border-t bg-gray-50 dark:bg-gray-900 rounded-b-lg">
              <button
                onClick={handleLogout}
                className="flex-1 btn btn-secondary"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
              
              <button
                onClick={handleExtendSession}
                disabled={isExtending}
                className="flex-1 btn btn-primary"
              >
                {isExtending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Extend Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Hook for session status
export function useSessionStatus() {
  const { 
    isAuthenticated, 
    getTimeUntilExpiry, 
    isSessionExpiringSoon 
  } = useAuth()

  const [timeRemaining, setTimeRemaining] = useState(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry()
      setTimeRemaining(remaining)
      setIsExpiringSoon(isSessionExpiringSoon())
    }, 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, getTimeUntilExpiry, isSessionExpiringSoon])

  return {
    timeRemaining,
    isExpiringSoon,
    formatTime: (ms) => {
      if (ms === null) return '--'
      
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
      } else {
        return `${seconds}s`
      }
    }
  }
}