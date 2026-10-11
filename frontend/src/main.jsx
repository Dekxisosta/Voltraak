import React from 'react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DensityProvider } from '@/contexts/DensityContext'
import { LayoutPreferenceProvider } from '@/contexts/LayoutPreferenceContext'
import { NotificationProvider } from '@/hooks/useNotifications'
import NotificationContainer from '@/components/common/NotificationContainer'
import { AuthProvider } from '@/contexts/AuthContext'
import './styles/index.css'

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./pages/**/*.jsx', { eager: true })
    const page = pages[`./pages/${name}.jsx`]
    if (!page) {
      throw new Error(`Page not found: ${name}`)
    }
    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <React.StrictMode>
        <ThemeProvider>
          <DensityProvider>
            <LayoutPreferenceProvider>
              <NotificationProvider>
                <AuthProvider>
                  <App {...props} />
                  <NotificationContainer />
                </AuthProvider>
              </NotificationProvider>
            </LayoutPreferenceProvider>
          </DensityProvider>
        </ThemeProvider>
      </React.StrictMode>
    )
  },
})
