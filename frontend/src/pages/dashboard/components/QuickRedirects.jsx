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

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600 group-hover:bg-blue-100',
  green: 'bg-green-50 border-green-200 text-green-600 group-hover:bg-green-100',
  amber: 'bg-amber-50 border-amber-200 text-amber-700 group-hover:bg-amber-100',
  purple: 'bg-purple-50 border-purple-200 text-purple-600 group-hover:bg-purple-100',
  red: 'bg-red-50 border-red-200 text-red-600 group-hover:bg-red-100',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 group-hover:bg-yellow-100',
}

export default function QuickRedirects({ title = 'Jump to', items }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">Go straight to your specialized tabs</p>
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
  const colors = colorClasses[item.color] || colorClasses.blue

  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className={`flex-shrink-0 rounded-md border p-2 transition-colors ${colors}`}>
          <item.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
          {item.description && (
            <p className="text-xs text-gray-500 truncate">{item.description}</p>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </Link>
  )
}
