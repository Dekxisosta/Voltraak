/**
 * Inventory Staff dashboard
 * Surfaces stock levels/movements/reservations/expiry status and links
 * straight into the Inventory section's tabs.
 */

import { useEffect, useState } from 'react'
import { ArrowUpDown, BarChart3, AlertCircle, Package, Calendar } from 'lucide-react'
import { formatNumber } from '@/shared/utils'
import { createResourceDataSource } from '@/shared/services/dataSource'
import QuickRedirects from './components/QuickRedirects'
import RecentActivity from './components/RecentActivity'
import WhatsNew from './components/WhatsNew'
import RelatedLinks from './components/RelatedLinks'

// Same sources ItemUpdatePage / StockLevelsPage / ReservationsPage /
// ExpiryAlertsPage / DiscrepanciesPage read and write — subscribing here
// means a mutation on any of those pages updates these cards immediately,
// without a reload.
const productsSource = createResourceDataSource('inventory/item-update')
const stockLevelsSource = createResourceDataSource('inventory/stock-levels')
const reservationsSource = createResourceDataSource('inventory/reservations')
const expiryBatchesSource = createResourceDataSource('inventory/expiry-alerts')
const discrepanciesSource = createResourceDataSource('inventory/discrepancies')

function buildStats({ products, stockLevels, reservations, expiryBatches, discrepancies }) {
  // "Low stock" mirrors the definition StockLevelsPage itself uses:
  // status 'critical' or 'warning' (out_of_stock is its own, worse bucket).
  const lowStock = stockLevels.filter((s) => s.status === 'critical' || s.status === 'warning')
  const activeReservations = reservations.filter((r) => r.status === 'active')
  const expiringSoon = expiryBatches.filter((b) => b.status === 'warning')
  const openDiscrepancies = discrepancies.filter((d) => d.status === 'open' || d.status === 'investigating')

  return [
    {
      title: 'Total Products Tracked',
      value: formatNumber(products.length),
      change: `${products.filter((p) => p.is_active).length} active`,
      changeType: 'neutral',
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Low Stock Items',
      value: lowStock.length,
      change: `${stockLevels.filter((s) => s.status === 'out_of_stock').length} out of stock`,
      changeType: 'decrease',
      icon: BarChart3,
      color: 'yellow',
    },
    {
      title: 'Open Reservations',
      value: activeReservations.length,
      change: reservations.some((r) => r.status === 'expired')
        ? `${reservations.filter((r) => r.status === 'expired').length} expired`
        : null,
      changeType: 'neutral',
      icon: ArrowUpDown,
      color: 'purple',
    },
    {
      title: 'Open Discrepancies',
      value: openDiscrepancies.length,
      change: openDiscrepancies.length > 0 ? `${openDiscrepancies.filter((d) => d.priority === 'high').length} high priority` : null,
      changeType: 'decrease',
      icon: AlertCircle,
      color: 'red',
    },
    {
      title: 'Batches Nearing Expiry',
      value: expiringSoon.length,
      change: 'expiring soon',
      changeType: 'decrease',
      icon: Calendar,
      color: 'red',
    },
  ]
}

const quickRedirectItems = [
  {
    label: 'Stock In/Out',
    description: 'Record inventory movement',
    basePath: '/inventory',
    tab: 'stock-in-out',
    icon: ArrowUpDown,
    color: 'blue',
  },
  {
    label: 'Stock Levels',
    description: 'Check current on-hand quantities',
    basePath: '/inventory',
    tab: 'stock-levels',
    icon: BarChart3,
    color: 'green',
  },
  {
    label: 'Damage Reports',
    description: 'Log damaged or written-off stock',
    basePath: '/inventory',
    tab: 'damage-report',
    icon: AlertCircle,
    color: 'red',
  },
  {
    label: 'Item Updates',
    description: 'Edit product details and attributes',
    basePath: '/inventory',
    tab: 'item-update',
    icon: Package,
    color: 'purple',
  },
  {
    label: 'Reservations',
    description: 'Manage held stock for orders',
    basePath: '/inventory',
    tab: 'reservations',
    icon: Package,
    color: 'amber',
  },
  {
    label: 'Expiry Alerts',
    description: 'Review upcoming batch expirations',
    basePath: '/inventory',
    tab: 'expiry-alerts',
    icon: Calendar,
    color: 'yellow',
  },
  {
    label: 'Discrepancies',
    description: 'Investigate and resolve count mismatches',
    basePath: '/inventory',
    tab: 'discrepancies',
    icon: AlertCircle,
    color: 'red',
  },
]

const colorClasses = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  green: { bg: 'bg-green-50 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  red: { bg: 'bg-red-50 dark:bg-red-900/30', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
}

export default function InventoryDashboard() {
  const [products, setProducts] = useState([])
  const [stockLevels, setStockLevels] = useState([])
  const [reservations, setReservations] = useState([])
  const [expiryBatches, setExpiryBatches] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])

  useEffect(() => {
    const unsubscribers = [
      productsSource.subscribe(setProducts),
      stockLevelsSource.subscribe(setStockLevels),
      reservationsSource.subscribe(setReservations),
      expiryBatchesSource.subscribe(setExpiryBatches),
      discrepanciesSource.subscribe(setDiscrepancies),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  const stats = buildStats({ products, stockLevels, reservations, expiryBatches, discrepancies })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <WhatsNew />

      <RelatedLinks />

      <QuickRedirects title="Inventory Tabs" items={quickRedirectItems} />

      <RecentActivity />
    </div>
  )
}

function StatCard({ stat }) {
  const colors = colorClasses[stat.color]

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`p-2 rounded-md flex-shrink-0 ${colors.bg} ${colors.border} border`}>
            <stat.icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{stat.value}</p>
            {stat.change && (
              <p
                className={`text-xs mt-1 truncate ${
                  stat.changeType === 'increase'
                    ? 'text-green-600 dark:text-green-400'
                    : stat.changeType === 'decrease'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {stat.change}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
