/**
 * Enhanced route guard component with comprehensive access control
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { AlertTriangle, Lock, ArrowLeft } from 'lucide-react'

function UnauthorizedPage({
  reason,
  requiredRoles,
  requiredPermissions,
  currentRole,
  showBackButton = true,
  customErrorMessage,
  onBack
}) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  const getErrorMessage = () => {
    if (customErrorMessage) return customErrorMessage

    switch (reason) {
      case 'not_authenticated':
        return 'You need to be logged in to access this page.'
      case 'insufficient_role':
        return 'You don\'t have the required role to access this page.'
      case 'insufficient_permission':
        return 'You don\'t have the required permissions to access this page.'
      case 'custom_check_failed':
        return 'Access denied: You don\'t meet the requirements for this page.'
      default:
        return 'Access denied.'
    }
  }

  const getErrorDetails = () => {
    const details = []
    
    if (requiredRoles && requiredRoles.length > 0) {
      details.push(`Required roles: ${requiredRoles.join(', ')}`)
    }
    
    if (requiredPermissions && requiredPermissions.length > 0) {
      details.push(`Required permissions: ${requiredPermissions.join(', ')}`)
    }
    
    if (currentRole) {
      details.push(`Your role: ${currentRole}`)
    }
    
    return details
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        {/* Error icon and status */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            {reason === 'not_authenticated' ? (
              <Lock className="w-8 h-8 text-red-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {reason === 'not_authenticated' ? '401' : '403'}
          </h1>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {reason === 'not_authenticated' ? 'Authentication Required' : 'Access Forbidden'}
          </h2>
        </div>

        {/* Error message */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 mb-6">
          <p className="text-gray-700 mb-4">
            {getErrorMessage()}
          </p>

          {/* Error details */}
          {getErrorDetails().length > 0 && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm font-medium text-gray-800 mb-2">Details:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {getErrorDetails().map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex-1 btn btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Additional help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  )
}

export default function RouteGuard({
  children,
  requiredRoles,
  requireAllRoles = false,
  requiredPermissions,
  requireAllPermissions = false,
  redirectTo,
  fallbackComponent: FallbackComponent,
  customCheck,
  showBackButton = true,
  customErrorMessage
}) {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    hasPermission,
    hasAnyRole,
    hasAllRoles 
  } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Checking access..." />
      </div>
    )
  }

  // Check authentication
  if (!isAuthenticated) {
    if (redirectTo) {
      return (
        <Navigate
          to={redirectTo}
          state={{ from: location.pathname, reason: 'not_authenticated' }}
          replace
        />
      )
    }

    if (FallbackComponent) {
      return <FallbackComponent />
    }

    return (
      <UnauthorizedPage
        reason="not_authenticated"
        showBackButton={showBackButton}
        customErrorMessage={customErrorMessage}
        onBack={() => window.location.href = '/login'}
      />
    )
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const roleCheck = requireAllRoles 
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles)
    
    if (!roleCheck) {
      if (FallbackComponent) {
        return <FallbackComponent />
      }

      return (
        <UnauthorizedPage
          reason="insufficient_role"
          requiredRoles={requiredRoles}
          currentRole={user?.role}
          showBackButton={showBackButton}
          customErrorMessage={customErrorMessage}
        />
      )
    }
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissionCheck = requireAllPermissions
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission))
    
    if (!permissionCheck) {
      if (FallbackComponent) {
        return <FallbackComponent />
      }

      return (
        <UnauthorizedPage
          reason="insufficient_permission"
          requiredPermissions={requiredPermissions}
          currentRole={user?.role}
          showBackButton={showBackButton}
          customErrorMessage={customErrorMessage}
        />
      )
    }
  }

  // Check custom access function
  if (customCheck && !customCheck(user)) {
    if (FallbackComponent) {
      return <FallbackComponent />
    }

    return (
      <UnauthorizedPage
        reason="custom_check_failed"
        currentRole={user?.role}
        showBackButton={showBackButton}
        customErrorMessage={customErrorMessage}
      />
    )
  }

  // All checks passed, render protected content
  return <>{children}</>
}

// Convenience components for common access patterns

export function RoleGuard({ children, roles, requireAll = false, fallback }) {
  const roleArray = Array.isArray(roles) ? roles : [roles]
  
  return (
    <RouteGuard
      requiredRoles={roleArray}
      requireAllRoles={requireAll}
      fallbackComponent={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </RouteGuard>
  )
}

export function PermissionGuard({ 
  children, 
  permissions, 
  requireAll = false, 
  fallback 
}) {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
  
  return (
    <RouteGuard
      requiredPermissions={permissionArray}
      requireAllPermissions={requireAll}
      fallbackComponent={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </RouteGuard>
  )
}

// Hook for programmatic access control
export function useAccessControl() {
  const { user, canAccessRoute, hasRole, hasPermission } = useAuth()

  const checkAccess = React.useCallback((requirements) => {
    const { roles, permissions, customCheck } = requirements
    return canAccessRoute(roles, permissions) && (!customCheck || customCheck(user))
  }, [canAccessRoute, user])

  return {
    checkAccess,
    hasRole,
    hasPermission,
    canAccessRoute
  }
}