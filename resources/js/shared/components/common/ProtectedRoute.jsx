/**
 * Protected route component that requires authentication
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({
  children,
  roles,
  requiredRoles,
  permissions,
  redirectTo = '/login',
}) {
  const { isAuthenticated, loading, user, hasRole, hasPermission } = useAuth()
  const location = useLocation()

  // Use requiredRoles if provided, otherwise use roles
  const rolesToCheck = requiredRoles || roles
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  // Check role requirements
  if (rolesToCheck && rolesToCheck.length > 0) {
    const hasRequiredRole = rolesToCheck.some(role => hasRole(role))
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">403</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access this page
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Required roles: {rolesToCheck.join(', ')}
              <br />
              Your role: {user?.role}
            </p>
            <button
              onClick={() => window.history.back()}
              className="btn btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  // Check permission requirements
  if (permissions && permissions.length > 0) {
    const hasRequiredPermission = permissions.some(permission => hasPermission(permission))
    if (!hasRequiredPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">403</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to perform this action
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Required permissions: {permissions.join(', ')}
            </p>
            <button
              onClick={() => window.history.back()}
              className="btn btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  // Render protected content
  return <>{children}</>
}

// Hook for conditional rendering based on permissions
export function usePermissionCheck() {
  const { hasRole, hasPermission } = useAuth()

  const canAccess = React.useCallback((requirements) => {
    const { roles, permissions, requireAll = false } = requirements

    if (roles && roles.length > 0) {
      const roleCheck = requireAll
        ? roles.every(role => hasRole(role))
        : roles.some(role => hasRole(role))
      
      if (!roleCheck) return false
    }

    if (permissions && permissions.length > 0) {
      const permissionCheck = requireAll
        ? permissions.every(permission => hasPermission(permission))
        : permissions.some(permission => hasPermission(permission))
      
      if (!permissionCheck) return false
    }

    return true
  }, [hasRole, hasPermission])

  return { canAccess }
}

// Component for conditional rendering

export function ConditionalRender({
  children,
  roles,
  permissions,
  requireAll = false,
  fallback = null,
}) {
  const { canAccess } = usePermissionCheck()

  const hasAccess = canAccess({
    roles,
    permissions,
    requireAll,
  })

  return hasAccess ? <>{children}</> : <>{fallback}</>
}