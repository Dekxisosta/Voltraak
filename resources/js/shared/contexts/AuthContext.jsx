import React, { createContext, useContext } from 'react'
import { usePage, router } from '@inertiajs/react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  // usePage() is safe here because AuthProvider is now rendered inside the
  // Inertia component tree (via InertiaAuthWrapper in main.jsx's resolve()),
  // not outside it. The Inertia context is available at this point.
  const { auth } = usePage().props
  const user = auth?.user || null
  const permissions = auth?.permissions || []

  const login = (email, password, remember = false) =>
    new Promise((resolve, reject) => {
      router.post('/login', { email, password, remember }, {
        onSuccess: () => resolve(),
        onError: (errors) =>
          reject(new Error(errors?.email || errors?.password || 'Invalid credentials')),
      })
    })

  const logout = () => router.post('/logout')

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'manager' || user.role === 'admin') return true
    return permissions.includes(permission)
  }

  const hasRole    = (role)  => user?.role === role
  const hasAnyRole = (roles) => roles.includes(user?.role)

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      loading: false,
      isAuthenticated: !!user,
      login,
      logout,
      hasPermission,
      hasRole,
      hasAnyRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
