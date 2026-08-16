/**
 * Main application component with routing and providers
 */

import { ErrorBoundary, NotificationContainer } from '@/components/common'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import { ThemeProvider } from '@/shared/contexts/ThemeContext'
import { NotificationProvider } from '@/shared/hooks/useNotifications'
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
        <ThemeProvider>
          <div className="min-h-screen py-8">
            <ApiTest />
          </div>
        </ThemeProvider>
      </ErrorBoundary>
    )
  }

  if (testMode === 'auth') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <NotificationProvider>
            <AuthProvider>
              <div className="min-h-screen py-8">
                <AuthFlowTest />
              </div>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <div className="min-h-screen">
              <AppRoutes />
              <NotificationContainer />
            </div>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
