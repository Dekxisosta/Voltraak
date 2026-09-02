/**
 * LoadingSpinner — Google Material-style indeterminate spinner.
 *
 * Two layered animations:
 *   1. The SVG itself rotates at a constant speed (outer spin).
 *   2. The stroke-dashoffset on the circle oscillates, making the arc
 *      appear to grow and shrink (inner dash animation).
 *
 * Colors cycle blue → red → yellow → green, matching Google's palette.
 * All keyframes live in a single injected <style> block so SVG properties
 * (stroke-dashoffset, stroke) aren't filtered out by Tailwind's purge.
 */

import { cn } from '@/utils'

const SIZES = {
  sm: { box: 16, stroke: 2 },
  md: { box: 24, stroke: 2.5 },
  lg: { box: 36, stroke: 3 },
}

const SPINNER_STYLES = `
@keyframes gSpinnerRotate {
  100% { transform: rotate(360deg); }
}

@keyframes gSpinnerDash {
  0%   { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 89, 200; stroke-dashoffset: -35px; }
  100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124px; }
}

@keyframes gSpinnerColor {
  0%, 100% { stroke: #4285F4; }
  25%       { stroke: #EA4335; }
  50%       { stroke: #FBBC05; }
  75%       { stroke: #34A853; }
}

.g-spinner-svg {
  animation: gSpinnerRotate 1.4s linear infinite;
  transform-origin: center;
}

.g-spinner-circle {
  stroke-linecap: round;
  animation:
    gSpinnerDash  1.4s ease-in-out infinite,
    gSpinnerColor 5.6s ease-in-out infinite;
}
`

let styleInjected = false
function ensureStyles() {
  if (styleInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = SPINNER_STYLES
  document.head.appendChild(el)
  styleInjected = true
}

export default function LoadingSpinner({ size = 'md', className, message }) {
  ensureStyles()

  const { box, stroke } = SIZES[size] ?? SIZES.md
  const r = (box - stroke) / 2
  const circumference = 2 * Math.PI * r

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-label={message ?? 'Loading'}
    >
      <svg
        className="g-spinner-svg"
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="g-spinner-circle"
          cx={box / 2}
          cy={box / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${circumference * 0.1} ${circumference}`}
          strokeDashoffset="0"
          fill="none"
        />
      </svg>

      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  )
}
