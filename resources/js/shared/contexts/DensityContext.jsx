/**
 * Density context - manages comfortable/compact display density
 * Persists user preference in localStorage. Applied as a `data-density`
 * attribute on <html>, which CSS variables in styles/index.css read to
 * adjust spacing across tables, cards, and form controls app-wide.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const DensityContext = createContext(undefined)

const DENSITY_KEY = 'density_preference'
const DENSITIES = ['comfortable', 'compact']

export function DensityProvider({ children }) {
  const [density, setDensityState] = useState(() => {
    const stored = localStorage.getItem(DENSITY_KEY)
    return DENSITIES.includes(stored) ? stored : 'comfortable'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  const setDensity = useCallback((next) => {
    if (!DENSITIES.includes(next)) return
    setDensityState(next)
    localStorage.setItem(DENSITY_KEY, next)
  }, [])

  const toggleDensity = useCallback(() => {
    setDensity(density === 'compact' ? 'comfortable' : 'compact')
  }, [density, setDensity])

  const value = {
    density,               // 'comfortable' | 'compact'
    setDensity,
    toggleDensity,
    isCompact: density === 'compact',
  }

  return (
    <DensityContext.Provider value={value}>
      {children}
    </DensityContext.Provider>
  )
}

export function useDensity() {
  const context = useContext(DensityContext)
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider')
  }
  return context
}
