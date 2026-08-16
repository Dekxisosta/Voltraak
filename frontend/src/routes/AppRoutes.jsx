/**
 * Application routing - composes role-based route modules
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/contexts/AuthContext'
import RouteGuard from '@/shared/components/common/RouteGuard'
import { AppShell, AuthLayout } from '@/shared/components/layout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

// Dashboard (shared)
import DashboardPage from '@/pages/dashboard/DashboardPage'

// Role-based route definitions
import { warehouseRoutes, warehouseLegacyRoutes } from './warehouse/WarehouseRoutes'
import { inventoryRoutes, inventoryLegacyRoutes } from './inventory/InventoryRoutes'
import { managerRoutes, managerLegacyRoutes } from './manager/ManagerRoutes'

// Combine all protected routes
const protectedRoutes = [
  ...warehouseRoutes,
  ...inventoryRoutes,
  ...managerRoutes,
]

// Old per-page paths (e.g. /warehouse/picking), kept working as redirects
// to the equivalent ?tab= route (e.g. /warehouse?tab=picking)
const legacyRoutes = [
  ...warehouseLegacyRoutes,
  ...inventoryLegacyRoutes,
  ...managerLegacyRoutes,
]

// Root redirect based on role
function RootRedirect() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  switch (user?.role) {
    case 'warehouse':
      return <Navigate to="/warehouse?tab=picking" replace />
    case 'inventory_staff':
      return <Navigate to="/inventory?tab=stock-in-out" replace />
    case 'manager':
      return <Navigate to="/manager?tab=kpi" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}

// Redirects an old per-page path (e.g. /warehouse/picking) to the
// equivalent ?tab= route (e.g. /warehouse?tab=picking)
function LegacyTabRedirect({ basePath, tab }) {
  return <Navigate to={`${basePath}?tab=${tab}`} replace />
}

// Protected layout with role guard
function ProtectedLayout({ children, requiredRoles }) {
  return (
    <RouteGuard requiredRoles={requiredRoles} redirectTo="/login">
      <AppShell>
        {children}
      </AppShell>
    </RouteGuard>
  )
}

// 404
function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you are looking for does not exist.</p>
        <button
          onClick={() => window.location.href = isAuthenticated ? '/dashboard' : '/login'}
          className="btn btn-primary"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </button>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
      <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Dashboard - all authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedLayout>
          <DashboardPage />
        </ProtectedLayout>
      } />

      {/* Role-based routes rendered from config */}
      {protectedRoutes.map(({ path, element, roles }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedLayout requiredRoles={roles}>
              {element}
            </ProtectedLayout>
          }
        />
      ))}

      {/* Legacy per-page paths - redirect to the ?tab= equivalent */}
      {legacyRoutes.map(({ path, tab, roles }) => {
        const basePath = path.slice(0, path.lastIndexOf('/'))
        return (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedLayout requiredRoles={roles}>
                <LegacyTabRedirect basePath={basePath} tab={tab} />
              </ProtectedLayout>
            }
          />
        )
      })}

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
