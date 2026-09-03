/**
 * Authentication Context with routing guards
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useNotifications } from '@/hooks/useNotifications'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification, clearAll } = useNotifications()

  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize authentication state — rehydrates straight from localStorage
  // (token + user) so a page reload restores the session immediately,
  // without waiting on a network round-trip first.
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = authApi.getStoredToken()

      if (!storedToken) {
        clearAuthData()
        return
      }

      const storedUser = authApi.getStoredUser()

      if (storedUser) {
        setToken(storedToken)
        setUser(storedUser)
        return
      }

      // Token exists but no cached user (e.g. an older session) — fall
      // back to fetching it once so the session still resolves.
      try {
        const currentUser = await authApi.me()
        setToken(storedToken)
        setUser(currentUser)
      } catch (error) {
        console.warn('Auth verification failed, clearing session:', error.message)
        clearAuthData()
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      clearAuthData()
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear authentication data
  const clearAuthData = useCallback(() => {
    setUser(null)
    setToken(null)
    authApi.clearAuth()
  }, [])

  // Store auth data
  const storeAuthData = useCallback((authResponse) => {
    const { user: authUser, token: jwtToken } = authResponse
    setUser(authUser)
    setToken(jwtToken)
  }, [])

  // Login function
  const login = useCallback(async (email, password, redirectTo) => {
    try {
      setLoading(true)

      const authResponse = await authApi.login({ email, password })
      storeAuthData(authResponse)

      showNotification({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${authResponse.user.name}!`
      })

      // Redirect to requested page or role-based default
      const targetPath = redirectTo || location.state?.from || getRoleDefaultPath(authResponse.user.role)
      navigate(targetPath, { replace: true })

    } catch (error) {
      clearAuthData()
      throw error
    } finally {
      setLoading(false)
    }
  }, [storeAuthData, clearAuthData, navigate, location.state, showNotification])

  // Logout function
  const logout = useCallback(async (redirectTo = '/login') => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      clearAuthData()
      clearAll()
      navigate(redirectTo, { replace: true })

      showNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been logged out successfully.'
      })
    }
  }, [clearAuthData, clearAll, navigate, showNotification])

  // Update current user's profile (name/email)
  const updateProfile = useCallback(async (patch) => {
    const updatedUser = await authApi.updateProfile(patch)
    setUser(updatedUser)
    showNotification({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully.'
    })
    return updatedUser
  }, [showNotification])

  // Change current user's password
  const changePassword = useCallback(async (passwordData) => {
    const result = await authApi.changePassword(passwordData)
    showNotification({
      type: 'success',
      title: 'Password Changed',
      message: 'Your password has been changed successfully.'
    })
    return result
  }, [showNotification])

  // Get role-based default path
  const getRoleDefaultPath = useCallback((role) => {
    switch (role) {
      case 'warehouse':
        return '/warehouse?tab=picking'
      case 'inventory_staff':
        return '/inventory?tab=stock-in-out'
      case 'manager':
        return '/manager?tab=kpi'
      case 'admin':
        return '/dashboard'
      default:
        return '/dashboard'
    }
  }, [])

  // Permission checking functions
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission) || user.permissions.includes('*')
  }, [user])

  const hasRole = useCallback((roles) => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }, [user])

  const hasAnyRole = useCallback((roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const hasAllRoles = useCallback((roles) => {
    if (!user) return false
    return roles.every(role => user.role === role)
  }, [user])

  // Route access checking
  const canAccessRoute = useCallback((requiredRoles, requiredPermissions) => {
    if (!user) return false

    if (requiredRoles && requiredRoles.length > 0) {
      if (!hasAnyRole(requiredRoles)) return false
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!requiredPermissions.some(permission => hasPermission(permission))) return false
    }

    return true
  }, [user, hasAnyRole, hasPermission])

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Context value
  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,

    // Actions
    login,
    logout,
    updateProfile,
    changePassword,

    // Permission checking
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,

    // Route access
    canAccessRoute,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks for common authentication checks
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth()

  if (!loading && !isAuthenticated) {
    throw new Error('Authentication required')
  }

  return { isAuthenticated, loading }
}

export function useRequireRole(roles) {
  const { hasRole, loading } = useAuth()

  const hasRequiredRole = hasRole(roles)

  if (!loading && !hasRequiredRole) {
    const roleList = Array.isArray(roles) ? roles.join(', ') : roles
    throw new Error(`Required role: ${roleList}`)
  }

  return { hasRequiredRole, loading }
}

export function useRequirePermission(permission) {
  const { hasPermission, loading } = useAuth()

  const hasRequiredPermission = hasPermission(permission)

  if (!loading && !hasRequiredPermission) {
    throw new Error(`Required permission: ${permission}`)
  }

  return { hasRequiredPermission, loading }
}
