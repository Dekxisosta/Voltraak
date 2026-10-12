/**
 * Recent activity component showing latest transactions and events.
 * Supports a `compact` prop for use in narrow panels (e.g. the right sidebar).
 */

import { Package, ArrowUp, ArrowDown, AlertCircle, User, Activity } from 'lucide-react'
import { formatDateTime } from '@/shared/utils'


const mockActivity = [
  {
    id: '1',
    type: 'stock_in',
    title: 'Stock Received',
    description: 'Samsung Galaxy S21 - Batch SGS21-240801 (50 units)',
    user: 'Juan Dela Cruz',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    icon: ArrowUp,
    color: 'green',
  },
  {
    id: '2',
    type: 'stock_out',
    title: 'Stock Issued',
    description: 'iPhone 14 Pro - 15 units shipped to customer order #1247',
    user: 'Maria Santos',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    icon: ArrowDown,
    color: 'blue',
  },
  {
    id: '3',
    type: 'count',
    title: 'Physical Count',
    description: 'Cycle count completed for Apple AirPods Pro - 2 variance found',
    user: 'Ana Rodriguez',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    icon: Package,
    color: 'yellow',
  },
  {
    id: '4',
    type: 'alert',
    title: 'Low Stock Alert',
    description: 'Xiaomi Redmi Note 12 below reorder point (8 units remaining)',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    icon: AlertCircle,
    color: 'red',
  },
  {
    id: '5',
    type: 'stock_in',
    title: 'Stock Received',
    description: 'MacBook Air M2 - Batch MBA-M2-240801 (12 units)',
    user: 'Carlos Mendoza',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    icon: ArrowUp,
    color: 'green',
  },
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    icon: 'text-gray-600 dark:text-gray-400',
  },
}

export default function RecentActivity({ compact = false, hideHeader = false }) {
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Header — hidden when parent renders its own sticky header */}
        {!hideHeader && (
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] select-none">
                Recent Activity
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {mockActivity.length} events
            </span>
          </div>
        )}

        {/* Compact list */}
        <div className="space-y-1.5">
          {mockActivity.map((item) => (
            <CompactActivityItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Activity</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-400">
            View all
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="flow-root">
          <ul className="-mb-8">
            {mockActivity.map((item, index) => (
              <ActivityItem
                key={item.id}
                item={item}
                isLast={index === mockActivity.length - 1}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function CompactActivityItem({ item }) {
  const colors = colorClasses[item.color]

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border-primary)',
      }}
    >
      <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${colors.bg}`}>
        <item.icon className={`h-3 w-3 ${colors.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
          {item.description}
        </p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {formatDateTime(item.timestamp)}
        </p>
      </div>
    </div>
  )
}

function ActivityItem({ item, isLast }) {
  const colors = colorClasses[item.color]

  return (
    <li>
      <div className="relative pb-8">
        {!isLast && (
          <span
            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
            aria-hidden="true"
          />
        )}
        <div className="relative flex items-start space-x-3">
          <div>
            <div className={`relative px-1 ${colors.bg} rounded-full p-2`}>
              <item.icon className={`h-5 w-5 ${colors.icon}`} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div>
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              <div className="mt-2 flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
                <span>{formatDateTime(item.timestamp)}</span>
                {item.user && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{item.user}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
