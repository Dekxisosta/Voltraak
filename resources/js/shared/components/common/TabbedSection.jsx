/**
 * TabbedSection
 *
 * Renders one of several page components based on the `?tab=` query param.
 * Uses window.location / Inertia router instead of React Router so it works
 * inside createInertiaApp without a BrowserRouter wrapper.
 *
 * If `?tab=` is missing or unknown, redirects to the default tab via
 * useEffect (never during render) to avoid Inertia navigation loops.
 */

import { useEffect } from 'react'
import { router } from '@inertiajs/react'

export default function TabbedSection({ basePath, tabs, defaultTab }) {
  const tab = new URLSearchParams(window.location.search).get('tab')
  const validTab = tab && tabs[tab] ? tab : null

  useEffect(() => {
    if (!validTab) {
      router.visit(`${basePath}?tab=${defaultTab}`, {
        replace: true,
        preserveScroll: true,
      })
    }
  }, [validTab, basePath, defaultTab])

  if (!validTab) return null

  const ActiveTab = tabs[validTab]
  return <ActiveTab />
}
