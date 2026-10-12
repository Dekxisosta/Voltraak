/**
 * Theme context - manages dark/light mode with system preference detection
 * Persists user preference in localStorage (only stores the preference, not user data)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(undefined)

const THEME_KEY = 'theme_preference'
const THEMES = ['light', 'dark', 'system']

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference) {
  if (preference === 'system') return getSystemTheme()
  return preference
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(preference))

  // Apply theme to document
  useEffect(() => {
    const resolved = resolveTheme(preference)
    setResolvedTheme(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
  }, [preference])

  // Listen for system theme changes when preference is "system"
  useEffect(() => {
    if (preference !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [preference])

  const setTheme = useCallback((newPreference) => {
    if (!THEMES.includes(newPreference)) return
    setPreference(newPreference)
    localStorage.setItem(THEME_KEY, newPreference)
  }, [])

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [resolvedTheme, setTheme])

  const value = {
    theme: resolvedTheme,       // 'light' | 'dark' (actual applied theme)
    preference,                  // 'light' | 'dark' | 'system' (user's choice)
    setTheme,                    // set preference
    toggleTheme,                 // quick toggle
    isDark: resolvedTheme === 'dark',
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
