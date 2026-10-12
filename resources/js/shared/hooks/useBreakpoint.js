/**
 * useBreakpoint - tracks which responsive tier the viewport currently
 * falls into: 'mobile' (< 768px), 'tablet' (768px - 1023px), or
 * 'desktop' (>= 1024px). Matches the md/lg breakpoints already used
 * throughout the app (see src/styles/tokens.js and Tailwind's defaults).
 *
 * Used to drive automatic layout choices (e.g. Table defaulting to a
 * card view on tablet, or a kanban board collapsing to cards on mobile)
 * without every consumer re-implementing its own matchMedia listeners.
 */

import { useState, useEffect } from 'react'

const MD_QUERY = '(min-width: 768px)'
const LG_QUERY = '(min-width: 1024px)'

function getBreakpoint() {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(LG_QUERY).matches) return 'desktop'
  if (window.matchMedia(MD_QUERY).matches) return 'tablet'
  return 'mobile'
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(getBreakpoint)

  useEffect(() => {
    const mdQuery = window.matchMedia(MD_QUERY)
    const lgQuery = window.matchMedia(LG_QUERY)
    const update = () => setBreakpoint(getBreakpoint())

    // Safari < 14 only supports the deprecated addListener/removeListener
    // pair, so fall back to that when addEventListener isn't available.
    if (mdQuery.addEventListener) {
      mdQuery.addEventListener('change', update)
      lgQuery.addEventListener('change', update)
    } else {
      mdQuery.addListener(update)
      lgQuery.addListener(update)
    }

    return () => {
      if (mdQuery.removeEventListener) {
        mdQuery.removeEventListener('change', update)
        lgQuery.removeEventListener('change', update)
      } else {
        mdQuery.removeListener(update)
        lgQuery.removeListener(update)
      }
    }
  }, [])

  return breakpoint
}
