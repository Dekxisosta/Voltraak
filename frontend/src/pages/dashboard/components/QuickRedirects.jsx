/**
 * QuickRedirects
 *
 * Grid of tiles that jump straight to a role's specialized tabs
 * (e.g. Warehouse -> Receiving, Picking, FEFO, Discrepancies).
 * Each item navigates to `${basePath}?tab=${tab}` via TabbedSection's
 * existing ?tab= convention, so no new routes are needed.
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// These tiles are navigation shortcuts, not status indicators - one
// consistent neutral treatment reads calmer than a different hue per tile.
const neutralTile =
  'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'

export default function QuickRedirects({ title = 'Jump to', items }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Go straight to your specialized tabs</p>
      </div>
      <div className="card-body">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <RedirectTile key={`${item.basePath}?tab=${item.tab}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RedirectTile({ item }) {
  const to = item.tab ? `${item.basePath}?tab=${item.tab}` : item.basePath

  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className={`flex-shrink-0 rounded-md border p-2 transition-colors ${neutralTile}`}>
          <item.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.label}</p>
          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
    </Link>
  )
}
