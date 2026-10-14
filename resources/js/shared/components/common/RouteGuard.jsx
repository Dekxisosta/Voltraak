/**
 * Route guard component — Inertia-native access control.
 *
 * Reads auth state from usePage().props (set by HandleInertiaRequests).
 * Redirects unauthenticated visitors via Inertia router.visit() so the
 * session cookie is respected and the backend can redirect to the correct
 * page after login.
 */

import React from 'react'
import { router } from '@inertiajs/react'
import { useAuth } from '@/shared/contexts/AuthContext'
import LoadingSpinner from '@/shared/components/common/LoadingSpinner'
import { AlertTriangle, Lock, ArrowLeft } from 'lucide-react'

// ─── Unauthorised UI ─────────────────────────────────────────────────────────

function UnauthorizedPage({
  reason,
  requiredRoles,
  requiredPermissions,
  currentRole,
  showBackButton = true,
  customErrorMessage,
}) {
  const handleBack = () => window.history.back()

  const getErrorMessage = () => {
    if (customErrorMessage) return customErrorMessage
    switch (reason) {
      case 'not_authenticated':    return 'You need to be logged in to access this page.'
      case 'insufficient_role':    return "You don't have the required role to access this page."
      case 'insufficient_permission': return "You don't have the required permissions to access this page."
      case 'custom_check_failed':  return "Access denied: You don't meet the requirements for this page."
      default:                     return 'Access denied.'
    }
  }

  const details = [
    requiredRoles?.length      && `Required roles: ${requiredRoles.join(', ')}`,
    requiredPermissions?.length && `Required permissions: ${requiredPermissions.join(', ')}`,
    currentRole                && `Your role: ${currentRole}`,
  ].filter(Boolean)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            {reason === 'not_authenticated'
              ? <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
              : <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {reason === 'not_authenticated' ? '401' : '403'}
          </h1>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {reason === 'not_authenticated' ? 'Authentication Required' : 'Access Forbidden'}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6 mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">{getErrorMessage()}</p>
          {details.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Details:</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {details.map((d, i) => (
                  <li key={i} className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {showBackButton && (
            <button onClick={handleBack} className="flex-1 btn btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}
          <button
            onClick={() => router.visit('/dashboard')}
            className="flex-1 btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  )
}

// ─── Main guard ───────────────────────────────────────────────────────────────

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
  customErrorMessage,
}) {
  const { user, loading, isAuthenticated, hasPermission, hasAnyRole } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" message="Checking access..." />
      </div>
    )
  }

  // Not authenticated → redirect via Inertia (preserves session cookie flow)
  if (!isAuthenticated) {
    if (redirectTo) {
      router.visit(redirectTo)
      return null
    }
    if (FallbackComponent) return <FallbackComponent />
    return (
      <UnauthorizedPage
        reason="not_authenticated"
        showBackButton={showBackButton}
        customErrorMessage={customErrorMessage}
      />
    )
  }

  // Role check
  if (requiredRoles?.length > 0) {
    // requireAllRoles: user must have every role listed (unusual but supported)
    const roleCheck = requireAllRoles
      ? requiredRoles.every(r => r === user?.role)
      : hasAnyRole(requiredRoles)

    if (!roleCheck) {
      if (FallbackComponent) return <FallbackComponent />
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

  // Permission check
  if (requiredPermissions?.length > 0) {
    const permCheck = requireAllPermissions
      ? requiredPermissions.every(p => hasPermission(p))
      : requiredPermissions.some(p => hasPermission(p))

    if (!permCheck) {
      if (FallbackComponent) return <FallbackComponent />
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

  // Custom check
  if (customCheck && !customCheck(user)) {
    if (FallbackComponent) return <FallbackComponent />
    return (
      <UnauthorizedPage
        reason="custom_check_failed"
        currentRole={user?.role}
        showBackButton={showBackButton}
        customErrorMessage={customErrorMessage}
      />
    )
  }

  return <>{children}</>
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function RoleGuard({ children, roles, requireAll = false, fallback }) {
  return (
    <RouteGuard
      requiredRoles={Array.isArray(roles) ? roles : [roles]}
      requireAllRoles={requireAll}
      fallbackComponent={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </RouteGuard>
  )
}

export function PermissionGuard({ children, permissions, requireAll = false, fallback }) {
  return (
    <RouteGuard
      requiredPermissions={Array.isArray(permissions) ? permissions : [permissions]}
      requireAllPermissions={requireAll}
      fallbackComponent={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </RouteGuard>
  )
}
