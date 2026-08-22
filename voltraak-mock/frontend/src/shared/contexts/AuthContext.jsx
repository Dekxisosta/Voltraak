/**
 * Enhanced Authentication Context with routing guards and session management
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useNotifications } from '@/hooks/useNotifications'


const AuthContext = createContext(undefined)

// Session timeout configuration (in milliseconds)
const SESSION_WARNING_TIME = 5 * 60 * 1000 // 5 minutes before expiry
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000 // 45 minutes



export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotifications()

  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiryTime, setSessionExpiryTime] = useState(null)
  
  // Timers for session management
  const [refreshTimer, setRefreshTimer] = useState(null)
  const [warningTimer, setWarningTimer] = useState(null)

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = authApi.getStoredToken()

      if (!storedToken) {
        clearAuthData()
        return
      }

      // Token exists — validate with backend and get user data
      try {
        const currentUser = await authApi.me()
        setToken(storedToken)
        setUser(currentUser)

        const expiryTime = Date.now() + (60 * 60 * 1000)
        setSessionExpiryTime(expiryTime)
        setupSessionManagement(expiryTime)
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
    setSessionExpiryTime(null)
    authApi.clearAuth()
    clearTimers()
  }, [])

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (refreshTimer) clearTimeout(refreshTimer)
    if (warningTimer) clearTimeout(warningTimer)
    setRefreshTimer(null)
    setWarningTimer(null)
  }, [refreshTimer, warningTimer])

  // Set up session management timers
  //
  // The scheduled timeout below must always call the *current* refreshTokenSilently
  // / handleSessionExpiry, not whatever they were bound to when setupSessionManagement
  // was first created. setupSessionManagement only depends on `clearTimers`, whose
  // identity doesn't change until after the first timer is scheduled — so without
  // this ref indirection, the very first refresh timer registered right after login
  // would permanently close over the pre-login `refreshTokenSilently` (token === null),
  // causing the auto-refresh to fail and log the user out ~45 minutes later.
  const refreshTokenSilentlyRef = useRef()
  const handleSessionExpiryRef = useRef()

  const setupSessionManagement = useCallback((expiryTime) => {
    clearTimers()
    
    // Set up automatic token refresh
    const timeUntilRefresh = Math.max(0, expiryTime - Date.now() - TOKEN_REFRESH_INTERVAL)
    const newRefreshTimer = setTimeout(async () => {
      try {
        await refreshTokenSilentlyRef.current()
      } catch (error) {
        console.error('Silent token refresh failed:', error)
        handleSessionExpiryRef.current()
      }
    }, timeUntilRefresh)
    setRefreshTimer(newRefreshTimer)

    // Set up session expiry warning
    const timeUntilWarning = Math.max(0, expiryTime - Date.now() - SESSION_WARNING_TIME)
    const newWarningTimer = setTimeout(() => {
      showSessionExpiryWarning()
    }, timeUntilWarning)
    setWarningTimer(newWarningTimer)
  }, [clearTimers])

  // Show session expiry warning
  const showSessionExpiryWarning = useCallback(() => {
    showNotification({
      type: 'warning',
      title: 'Session Expiring Soon',
      message: 'Your session will expire in 5 minutes. Click to extend.',
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'Extend Session',
        onClick: extendSession
      }
    })
  }, [showNotification])

  // Handle session expiry
  const handleSessionExpiry = useCallback(() => {
    showNotification({
      type: 'error',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      duration: 5000
    })
    clearAuthData()
    navigate('/login', { 
      state: { from: location.pathname, reason: 'session_expired' },
      replace: true 
    })
  }, [clearAuthData, navigate, location.pathname, showNotification])

  // Silent token refresh
  const refreshTokenSilently = useCallback(async () => {
    if (!token) throw new Error('No token to refresh')

    const { token: newJwtToken, expires_in } = await authApi.refreshToken()
    setToken(newJwtToken)
    
    const newExpiryTime = Date.now() + (expires_in * 1000)
    setSessionExpiryTime(newExpiryTime)
    setupSessionManagement(newExpiryTime)
  }, [token, setupSessionManagement])

  // Keep the scheduled-timer refs in sync with the latest closures so the
  // auto-refresh timeout (registered inside setupSessionManagement, which is
  // not recreated on every render) never calls a stale, pre-login version.
  useEffect(() => {
    refreshTokenSilentlyRef.current = refreshTokenSilently
  }, [refreshTokenSilently])

  useEffect(() => {
    handleSessionExpiryRef.current = handleSessionExpiry
  }, [handleSessionExpiry])

  // Store auth data and setup session
  const storeAuthData = useCallback((authResponse) => {
    const { user: authUser, token: jwtToken, expires_in } = authResponse
    
    setUser(authUser)
    setToken(jwtToken)
    
    const expiryTime = Date.now() + (expires_in * 1000)
    setSessionExpiryTime(expiryTime)
    setupSessionManagement(expiryTime)
  }, [setupSessionManagement])

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
      navigate(redirectTo, { replace: true })
      
      showNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been logged out successfully.'
      })
    }
  }, [clearAuthData, navigate, showNotification])

  // Manual token refresh
  const refreshToken = useCallback(async () => {
    try {
      await refreshTokenSilently()
      showNotification({
        type: 'success',
        title: 'Session Extended',
        message: 'Your session has been extended.'
      })
    } catch (error) {
      handleSessionExpiry()
      throw error
    }
  }, [refreshTokenSilently, handleSessionExpiry, showNotification])

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

  // Session management functions
  const extendSession = useCallback(() => {
    refreshToken().catch(error => {
      console.error('Failed to extend session:', error)
    })
  }, [refreshToken])

  const getTimeUntilExpiry = useCallback(() => {
    if (!sessionExpiryTime) return null
    return Math.max(0, sessionExpiryTime - Date.now())
  }, [sessionExpiryTime])

  const isSessionExpiringSoon = useCallback(() => {
    const timeUntilExpiry = getTimeUntilExpiry()
    return timeUntilExpiry !== null && timeUntilExpiry <= SESSION_WARNING_TIME
  }, [getTimeUntilExpiry])

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth()
    
    return () => {
      clearTimers()
    }
  }, [initializeAuth, clearTimers])

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
    refreshToken,
    updateProfile,
    changePassword,
    
    // Permission checking
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Route access
    canAccessRoute,
    
    // Session management
    extendSession,
    getTimeUntilExpiry,
    isSessionExpiringSoon,
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