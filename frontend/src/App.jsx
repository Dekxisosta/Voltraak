/**
 * Main application component with routing and providers
 */

import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary, NotificationContainer } from '@/components/common'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/hooks/useNotifications'
import AppRoutes from '@/routes/AppRoutes'
import ApiTest from '@/test/ApiTest'
import AuthFlowTest from '@/test/AuthFlowTest'

export default function App() {
  // Check if we're in test mode via URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  const testMode = urlParams.get('test')

  if (testMode === 'api') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 py-8">
          <ApiTest />
        </div>
      </ErrorBoundary>
    )
  }

  if (testMode === 'auth') {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <NotificationProvider>
            <AuthProvider>
              <div className="min-h-screen bg-gray-50 py-8">
                <AuthFlowTest />
              </div>
            </AuthProvider>
          </NotificationProvider>
        </BrowserRouter>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
              <NotificationContainer />
            </div>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}