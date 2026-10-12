/**
 * Live clock + date display shown in the header.
 * Ticks every second off a single interval; formatting uses Intl so it
 * respects the browser's locale without pulling in a date library.
 */

import { useEffect, useState } from 'react'

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="hidden sm:flex flex-col items-end leading-tight select-none">
      <span className="text-sm font-medium text-[var(--color-text-primary)] tabular-nums">
        {timeFormatter.format(now)}
      </span>
      <span className="text-xs text-[var(--color-text-tertiary)]">
        {dateFormatter.format(now)}
      </span>
    </div>
  )
}
