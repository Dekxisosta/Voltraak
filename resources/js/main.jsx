import React from 'react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/shared/contexts/ThemeContext'
import { DensityProvider } from '@/shared/contexts/DensityContext'
import { LayoutPreferenceProvider } from '@/shared/contexts/LayoutPreferenceContext'
import { NotificationProvider } from '@/shared/hooks/useNotifications'
import NotificationContainer from '@/shared/components/common/NotificationContainer'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import AppShell from '@/shared/components/layout/AppShell'
import { AuthLayout } from '@/shared/components/layout'
import './styles/index.css'

// Pages rendered inside AuthLayout (no sidebar/header)
const AUTH_PAGES = ['auth/LoginPage', 'auth/Login', 'auth/ForgotPasswordPage']

// Wrapper that provides AuthProvider inside the Inertia context
function InertiaAuthWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./pages/**/*.jsx', { eager: true })
    const page = pages[`./pages/${name}.jsx`]
    if (!page) throw new Error(`Page not found: ${name}`)

    const PageComponent = page.default

    // Set up persistent layout for pages that don't already have one
    if (!PageComponent.layout) {
      const Layout = AUTH_PAGES.includes(name) ? AuthLayout : AppShell
      
      PageComponent.layout = (page) => (
        <InertiaAuthWrapper>
          <Layout>
            {page}
          </Layout>
        </InertiaAuthWrapper>
      )
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
                <App {...props} />
                <NotificationContainer />
              </NotificationProvider>
            </LayoutPreferenceProvider>
          </DensityProvider>
        </ThemeProvider>
      </React.StrictMode>
    )
  },
})

