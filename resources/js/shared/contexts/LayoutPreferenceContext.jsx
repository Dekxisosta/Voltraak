/**
 * Layout preference context - lets a user pin how tables/lists across the
 * app should display their data: 'auto' (responsive default), 'list', or
 * 'cards'. Persists in localStorage, same pattern as DensityContext.
 *
 * 'auto' means <Table> picks list on desktop and cards on tablet/mobile
 * for readability - see useBreakpoint + Table.jsx's view-resolution
 * logic. Picking 'list' or 'cards' here pins that layout everywhere
 * regardless of screen size (kanban-enabled tables are the one
 * exception - see Table.jsx - since kanban only makes sense as a board,
 * not a preference toggle).
 */

import { createContext, useContext, useState, useCallback } from 'react'

const LayoutPreferenceContext = createContext(undefined)

const LAYOUT_KEY = 'layout_preference'
const LAYOUTS = ['auto', 'list', 'cards']

export function LayoutPreferenceProvider({ children }) {
  const [layoutPreference, setLayoutPreferenceState] = useState(() => {
    const stored = localStorage.getItem(LAYOUT_KEY)
    return LAYOUTS.includes(stored) ? stored : 'auto'
  })

  const setLayoutPreference = useCallback((next) => {
    if (!LAYOUTS.includes(next)) return
    setLayoutPreferenceState(next)
    localStorage.setItem(LAYOUT_KEY, next)
  }, [])

  const value = {
    layoutPreference,   // 'auto' | 'list' | 'cards'
    setLayoutPreference,
  }

  return (
    <LayoutPreferenceContext.Provider value={value}>
      {children}
    </LayoutPreferenceContext.Provider>
  )
}

export function useLayoutPreference() {
  const context = useContext(LayoutPreferenceContext)
  if (context === undefined) {
    throw new Error('useLayoutPreference must be used within a LayoutPreferenceProvider')
  }
  return context
}
