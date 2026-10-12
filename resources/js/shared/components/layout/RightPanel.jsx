/**
 * RightPanel
 *
 * Composable container for the AppShell's right-hand column.
 * Pages pass a <RightPanel> tree to AppShellContext.setRightPanel()
 * so the shell renders it in the 260px right column.
 *
 * Usage in a page component:
 *
 *   import { useEffect } from 'react'
 *   import { useAppShell } from '@/components/layout'
 *   import RightPanel, { RightPanelSection } from '@/components/layout/RightPanel'
 *   import AlertsPanel from './components/AlertsPanel'
 *
 *   export default function MyPage() {
 *     const { setRightPanel } = useAppShell()
 *
 *     useEffect(() => {
 *       setRightPanel(
 *         <RightPanel>
 *           <RightPanelSection title="Alerts"><AlertsPanel compact /></RightPanelSection>
 *         </RightPanel>
 *       )
 *       return () => setRightPanel(null)   // clear on unmount
 *     }, [setRightPanel])
 *
 *     return <div>…page content…</div>
 *   }
 */

import { cn } from '@/utils'

// ─── Root wrapper ─────────────────────────────────────────────────────────────

/**
 * Thin root wrapper — mostly a semantic marker so callers have a clear
 * import target. Actual spacing lives in AppShell's right aside.
 */
export default function RightPanel({ children, className }) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

/**
 * Optional labelled section inside the right panel.
 * Use when you want a titled group (e.g. "KPI Meter", "Top Items").
 */
export function RightPanelSection({ title, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1 select-none">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

/**
 * Compact vertical stat tile sized for the 260px column.
 *
 * Props:
 *   label     string   — metric name
 *   value     string   — formatted value
 *   delta     string?  — change label (e.g. "+8.1% vs last month")
 *   deltaType 'up'|'down'|'neutral'
 *   icon      LucideIcon?
 */
export function RightPanelStat({ label, value, delta, deltaType = 'neutral', icon: Icon }) {
  const deltaColor =
    deltaType === 'up'   ? 'text-emerald-600 dark:text-emerald-400' :
    deltaType === 'down' ? 'text-red-600 dark:text-red-400' :
                           'text-[var(--color-text-muted)]'

  return (
    <div className="card card-body py-3 px-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-1.5 rounded-md bg-[var(--color-bg-tertiary)] shrink-0">
            <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">{label}</p>
          <p className="text-xl font-bold text-[var(--color-text-primary)] leading-tight truncate">{value}</p>
          {delta && (
            <p className={cn('text-[11px] mt-0.5 truncate', deltaColor)}>{delta}</p>
          )}
        </div>
      </div>
    </div>
  )
}
