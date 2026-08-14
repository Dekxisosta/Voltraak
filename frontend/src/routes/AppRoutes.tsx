/**
 * Application routing configuration with enhanced authentication flow and guards
 */

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { RouteGuard, RoleGuard } from '@/components/common/RouteGuard'

// Layout components
import { AppShell, AuthLayout } from '@/components/layout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage'

// Warehouse Staff pages
import ReceivingPage from '@/pages/warehouse/ReceivingPage'
import PickingPage from '@/pages/warehouse/PickingPage'
import FEFOPage from '@/pages/warehouse/FEFOPage'
import DiscrepanciesPage from '@/pages/warehouse/DiscrepanciesPage'

// Inventory Staff pages
import StockInOutPage from '@/pages/inventory/StockInOutPage'
import StockLevelsPage from '@/pages/inventory/StockLevelsPage'

// Manager pages
import KPIDashboardPage from '@/pages/manager/KPIDashboardPage'

// Root redirect component
function RootRedirect() {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Redirect based on user role to their primary landing page
  switch (user?.role) {
    case 'warehouse':
      return <Navigate to="/warehouse/picking" replace />
    case 'inventory_staff':
      return <Navigate to="/inventory/stock-in-out" replace />
    case 'manager':
      return <Navigate to="/manager/kpi" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}

// Protected layout wrapper
interface ProtectedLayoutProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
}

function ProtectedLayout({ children, requiredRoles, requiredPermissions }: ProtectedLayoutProps) {
  return (
    <RouteGuard
      requiredRoles={requiredRoles}
      requiredPermissions={requiredPermissions}
      redirectTo="/login"
    >
      <AppShell>
        {children}
      </AppShell>
    </RouteGuard>
  )
}

// 404 Error Page Component
function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full btn btn-secondary"
          >
            Go Back
          </button>
          
          <button
            onClick={() => window.location.href = isAuthenticated ? '/dashboard' : '/login'}
            className="w-full btn btn-primary"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      } />
      
      <Route path="/forgot-password" element={
        <AuthLayout>
          <ForgotPasswordPage />
        </AuthLayout>
      } />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Dashboard - accessible to all authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedLayout>
          <DashboardPage />
        </ProtectedLayout>
      } />

      {/* Warehouse Staff routes */}
      <Route path="/warehouse/receiving" element={
        <ProtectedLayout requiredRoles={['warehouse', 'manager']}>
          <ReceivingPage />
        </ProtectedLayout>
      } />

      <Route path="/warehouse/picking" element={
        <ProtectedLayout requiredRoles={['warehouse', 'manager']}>
          <PickingPage />
        </ProtectedLayout>
      } />

      <Route path="/warehouse/fefo" element={
        <ProtectedLayout requiredRoles={['warehouse', 'manager']}>
          <FEFOPage />
        </ProtectedLayout>
      } />

      <Route path="/warehouse/discrepancies" element={
        <ProtectedLayout requiredRoles={['warehouse', 'manager']}>
          <DiscrepanciesPage />
        </ProtectedLayout>
      } />

      {/* Inventory Staff routes */}
      <Route path="/inventory/stock-in-out" element={
        <ProtectedLayout requiredRoles={['inventory_staff', 'manager']}>
          <StockInOutPage />
        </ProtectedLayout>
      } />

      <Route path="/inventory/stock-levels" element={
        <ProtectedLayout requiredRoles={['inventory_staff', 'manager']}>
          <StockLevelsPage />
        </ProtectedLayout>
      } />

      {/* Manager routes */}
      <Route path="/manager/kpi" element={
        <ProtectedLayout requiredRoles={['manager']}>
          <KPIDashboardPage />
        </ProtectedLayout>
      } />

      {/* Catch-all 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}