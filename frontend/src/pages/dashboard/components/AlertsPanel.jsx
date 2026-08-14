/**
 * Alerts panel showing critical notifications and warnings
 */

import { AlertTriangle, Clock, Package, TrendingDown } from 'lucide-react'
import { formatRelativeTime } from '@/utils'

const mockAlerts = [
  {
    id: '1',
    type: 'critical',
    title: 'Stock Out Alert',
    message: 'iPhone 14 Pro (128GB) has reached zero stock',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    icon: Package,
    action: {
      label: 'Create PO',
      onClick: () => console.log('Create purchase order'),
    },
  },
  {
    id: '2',
    type: 'warning',
    title: 'Batch Expiring Soon',
    message: '5 batches will expire within 7 days',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    icon: Clock,
    action: {
      label: 'View Batches',
      onClick: () => console.log('View expiring batches'),
    },
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low Stock Items',
    message: '12 products below reorder point',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    icon: TrendingDown,
    action: {
      label: 'Review',
      onClick: () => console.log('Review low stock items'),
    },
  },
  {
    id: '4',
    type: 'info',
    title: 'Physical Count Due',
    message: 'Monthly cycle count scheduled for tomorrow',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    icon: AlertTriangle,
  },
]

const alertTypeStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-800',
  },
}

export default function AlertsPanel() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Alerts</h3>
          <span className="text-sm text-gray-500">
            {mockAlerts.length} active
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {mockAlerts.length > 0 ? (
            mockAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
              <p className="mt-1 text-sm text-gray-500">
                All systems are running smoothly
              </p>
            </div>
          )}
        </div>

        {mockAlerts.length > 3 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="w-full text-sm text-blue-600 hover:text-blue-500">
              View all alerts ({mockAlerts.length})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertItem({ alert }) {
  const styles = alertTypeStyles[alert.type]

  return (
    <div className={`rounded-lg border p-3 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start">
        <alert.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="ml-3 flex-1">
          <h4 className={`text-sm font-medium ${styles.text}`}>
            {alert.title}
          </h4>
          <p className={`mt-1 text-sm ${styles.text} opacity-90`}>
            {alert.message}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {formatRelativeTime(alert.timestamp)}
            </p>
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className={`text-xs font-medium underline ${styles.icon} hover:opacity-75`}
              >
                {alert.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}