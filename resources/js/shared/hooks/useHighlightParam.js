/**
 * useHighlightParam
 *
 * Reads a one-shot `?highlight=<id>` query param and returns it.
 * The param is cleared from the URL after 2.5 s via Inertia router so a
 * refresh / shared link doesn't keep re-triggering the highlight.
 *
 * No React Router dependency — uses URLSearchParams + Inertia router.
 */

import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'

export function useHighlightParam(paramName = 'highlight') {
  const [highlightId] = useState(() =>
    new URLSearchParams(window.location.search).get(paramName)
  )
  const cleared = useRef(false)

  useEffect(() => {
    if (!highlightId || cleared.current) return
    cleared.current = true

    const timer = setTimeout(() => {
      const next = new URLSearchParams(window.location.search)
      next.delete(paramName)
      const qs = next.toString()
      router.visit(
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
        { replace: true, preserveState: true, preserveScroll: true }
      )
    }, 2500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return highlightId
}
