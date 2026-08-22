/**
 * useHighlightParam
 *
 * Reads a one-shot `?highlight=<id>` query param (set by the global search
 * bar when it links straight to a record) and hands it to whoever wants to
 * scroll to / flash that row — typically passed to <Table highlightRowId=.
 *
 * The id is captured once on mount so it survives even after the param is
 * cleared from the URL a moment later (kept out of the URL long-term so a
 * refresh or share of the link doesn't keep re-triggering the highlight).
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useHighlightParam(paramName = 'highlight') {
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightId] = useState(() => searchParams.get(paramName))
  const cleared = useRef(false)

  useEffect(() => {
    if (!highlightId || cleared.current) return
    cleared.current = true

    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(paramName)
          return next
        },
        { replace: true }
      )
    }, 2500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return highlightId
}
