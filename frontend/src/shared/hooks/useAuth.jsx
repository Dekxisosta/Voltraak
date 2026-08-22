/**
 * Authentication hook and provider
 * Manages user authentication state, tokens, and auth-related operations
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '@/api/auth'


const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load initial auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = authApi.getStoredToken()
        const storedUser = authApi.getStoredUser()

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(storedUser)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        // Clear corrupted data
        clearAuthData()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Clear auth data from state and localStorage
  const clearAuthData = useCallback(() => {
    setUser(null)
    setToken(null)
    authApi.clearAuth()
  }, [])

  // Store auth data in state and localStorage
  const storeAuthData = useCallback((authResponse) => {
    const { user: authUser, token: jwtToken } = authResponse
    
    setUser(authUser)
    setToken(jwtToken) // Store JWT token for display/state
    
    // API client handles api_token storage internally
  }, [])

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true)
      
      const authResponse = await authApi.login({ email, password })
      storeAuthData(authResponse)
    } catch (error) {
      clearAuthData()
      throw error
    } finally {
      setLoading(false)
    }
  }, [storeAuthData, clearAuthData])

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with local logout even if API call fails
    } finally {
      clearAuthData()
    }
  }, [clearAuthData])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    if (!token) {
      throw new Error('No token to refresh')
    }

    try {
      const { token: newJwtToken } = await authApi.refreshToken()
      
      // Update token in state (use JWT token for display/state)
      setToken(newJwtToken)
      
      // Get updated user profile
      const refreshedUser = await authApi.me()
      setUser(refreshedUser)
    } catch (error) {
      // If refresh fails, clear auth data
      clearAuthData()
      throw error
    }
  }, [token, clearAuthData])

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission) || user.permissions.includes('*')
  }, [user])

  // Check if user has specific role(s)
  const hasRole = useCallback((roles) => {
    if (!user) return false
    
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }, [user])

  // Set up automatic token refresh
  useEffect(() => {
    if (!token) return

    // Try to refresh token periodically (every 45 minutes for 1-hour tokens)
    const refreshInterval = setInterval(() => {
      refreshToken().catch(() => {
        // Token refresh failed, user will be logged out
        console.warn('Automatic token refresh failed')
      })
    }, 45 * 60 * 1000) // 45 minutes

    return () => clearInterval(refreshInterval)
  }, [token, refreshToken])

  // API client handles interceptors automatically

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    isAuthenticated: !!user && !!token,
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

// Helper hooks for common checks
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
    throw new Error(`Required role: ${Array.isArray(roles) ? roles.join(', ') : roles}`)
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