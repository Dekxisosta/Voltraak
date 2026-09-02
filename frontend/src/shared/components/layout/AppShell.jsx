/**
 * Main application shell — NetSuite-style 3-column layout.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Header (full-width sticky topbar, dark bg, logo + search + user)│
 * ├───────────────┬────────────────────────────┬─────────────────────┤
 * │  Left panel   │   Main content (scrollable) │   Right panel       │
 * │  220px fixed  │   flex-1                    │   260px fixed       │
 * │  Nav links    │   page children             │   Alerts / KPI      │
 * └───────────────┴────────────────────────────┴─────────────────────┘
 *
 * The left and right panels are sticky inside the body row so they stay
 * in view as the centre column scrolls. On tablet (< lg) the right panel
 * collapses below the main content; on mobile the left panel is a drawer.
 *
 * Pages that need to inject content into the right panel can use the
 * AppShellContext — pass `rightPanel` from their page component.
 * If no page provides rightPanel content, the shell renders nothing in
 * the right column (it collapses to zero width).
 */

import { createContext, useContext, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import AlertsPanel from '@/pages/dashboard/components/AlertsPanel'
import RecentActivity from '@/pages/dashboard/components/RecentActivity'

// Context lets pages push content into the right panel slot
export const AppShellContext = createContext({
  setRightPanel: () => {},
})
export const useAppShell = () => useContext(AppShellContext)

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightPanel, setRightPanel] = useState(null)

  return (
    <AppShellContext.Provider value={{ setRightPanel }}>
      {/* Full-height flex column */}
      <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-secondary)]">

        {/* ── Topbar ──────────────────────────────────────────────── */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* ── Body row ────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left panel — desktop ──────────────────────────────── */}
          {/* Sticky inside the body row; scrolls independently */}
          <aside
            className="hidden lg:flex flex-col w-[220px] shrink-0 overflow-y-auto scrollbar-hide border-r border-[var(--color-glass-border)]"
            style={{
              background: 'var(--color-glass-sidebar)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            }}
          >
            <Sidebar />
          </aside>

          {/* ── Mobile sidebar drawer ─────────────────────────────── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-[var(--color-overlay)]"
                style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                onClick={() => setSidebarOpen(false)}
              />
              <div
                className="fixed inset-y-0 left-0 w-[220px] overflow-y-auto scrollbar-hide border-r border-[var(--color-glass-border)]"
                style={{
                  background: 'var(--color-glass-sidebar)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                }}
              >
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* ── Centre — main scrollable content ─────────────────── */}
          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-hide">
            <div className="py-5 px-4 sm:px-6 lg:px-8 min-h-full">
              {children}
            </div>
          </main>

          {/* ── Right panel — always visible, alerts persist across all routes ── */}
          <aside
            className="hidden xl:flex flex-col w-[280px] shrink-0 border-l border-[var(--color-glass-border)]"
            style={{
              background: 'var(--color-glass-panel)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            }}
          >
            {/* Page-specific content injected via setRightPanel() */}
            {rightPanel && (
              <div className="flex-shrink-0 p-4 border-b border-[var(--color-glass-border)]">
                {rightPanel}
              </div>
            )}

            {/* Top half — Alerts */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-b border-[var(--color-glass-border)]">
              {/* Sticky header */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-glass-border)]"
                style={{ background: 'var(--color-glass-panel)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] select-none">
                    Alerts
                  </span>
                </div>
              </div>
              {/* Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4">
                <AlertsPanel hideHeader />
              </div>
            </div>

            {/* Bottom half — Recent Activity */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Sticky header */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-glass-border)]"
                style={{ background: 'var(--color-glass-panel)' }}
              >
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] select-none">
                  Recent Activity
                </span>
              </div>
              {/* Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4">
                <RecentActivity compact hideHeader />
              </div>
            </div>
          </aside>

        </div>
      </div>
    </AppShellContext.Provider>
  )
}
