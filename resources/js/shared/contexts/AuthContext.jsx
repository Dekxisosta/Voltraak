import React, { createContext, useContext } from 'react'
import { usePage, router } from '@inertiajs/react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const { auth } = usePage().props
  const user = auth?.user || null

  const logout = () => {
    router.post('/logout')
  }

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'manager') return true
    return user.permissions?.includes(permission) || false
  }

  const hasRole = (role) => {
    return user?.role === role
  }

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role)
  }

  const value = {
    user,
    loading: false,
    isAuthenticated: !!user,
    logout,
    hasPermission,
    hasRole,
    hasAnyRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
