/**
 * Main application component with routing and providers
 */

import { ErrorBoundary, NotificationContainer } from '@/components/common'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import { ThemeProvider } from '@/shared/contexts/ThemeContext'
import { DensityProvider } from '@/shared/contexts/DensityContext'
import { LayoutPreferenceProvider } from '@/shared/contexts/LayoutPreferenceContext'
import { NotificationProvider } from '@/shared/hooks/useNotifications'
import AppRoutes from '@/routes/AppRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DensityProvider>
          <LayoutPreferenceProvider>
            <NotificationProvider>
              <AuthProvider>
                <div className="min-h-screen">
                  <AppRoutes />
                  <NotificationContainer />
                </div>
              </AuthProvider>
            </NotificationProvider>
          </LayoutPreferenceProvider>
        </DensityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
