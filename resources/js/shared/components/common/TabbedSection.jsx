/**
 * TabbedSection
 *
 * Renders one of several page components based on the `?tab=` query param
 * on the current URL, instead of each page living at its own route path.
 * Used by the warehouse/inventory/manager role sections so e.g.
 * `/warehouse/picking` becomes `/warehouse?tab=picking`.
 *
 * If `tab` is missing or doesn't match a key in `tabs`, redirects to
 * `${basePath}?tab=${defaultTab}` so the URL always reflects what's shown.
 */

import { Navigate, useSearchParams } from 'react-router-dom'

export default function TabbedSection({ basePath, tabs, defaultTab }) {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')

  if (!tab || !tabs[tab]) {
    return <Navigate to={`${basePath}?tab=${defaultTab}`} replace />
  }

  const ActiveTab = tabs[tab]
  return <ActiveTab />
}
