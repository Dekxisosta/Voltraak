/**
 * Global search
 *
 * Powers the header search bar. Searches across every mock collection the
 * current user's role can actually reach (mirroring the sidebar's
 * role -> tabs mapping), and returns lightweight results that link straight
 * to the matching record's page/tab with a `highlight` param so the target
 * page can scroll to and flash that row.
 *
 * Adding a new searchable resource: add one entry to SEARCH_SOURCES below.
 */

import { listRecords } from './mockStore'

// Icon key per source, resolved to an actual lucide-react component in
// GlobalSearchBar (kept as a string here so this file has no JSX/UI deps).

// Each source maps a mock collection (see shared/mocks/collections.js) to
// where it lives in the app and how to render/match it.
//   key          - collection key used by mockStore/listRecords
//   basePath/tab - where the record's page lives, e.g. /inventory?tab=stock-levels
//   roles        - which roles can reach that tab (mirrors Sidebar.jsx / route ROLES).
//                  'manager' can always see everything, so it's implied and
//                  doesn't need to be listed explicitly.
//   type         - short label shown next to each result
//   title/subtitle - functions that build display text from a record
//   searchText   - function that builds the haystack a query is matched against
const SEARCH_SOURCES = [
  {
    key: 'inventory/stock-levels',
    icon: 'BarChart3',
    basePath: '/inventory',
    tab: 'stock-levels',
    roles: ['inventory_staff'],
    type: 'Stock Level',
    title: (r) => r.product_name,
    subtitle: (r) => `${r.product_sku} · ${r.location}`,
    searchText: (r) => [r.product_name, r.product_sku, r.category, r.location].join(' '),
  },
  {
    key: 'inventory/item-update',
    icon: 'Package',
    basePath: '/inventory',
    tab: 'item-update',
    roles: ['inventory_staff'],
    type: 'Product',
    title: (r) => r.name,
    subtitle: (r) => `${r.sku} · ${r.category}`,
    searchText: (r) => [r.name, r.sku, r.category].join(' '),
  },
  {
    key: 'inventory/stock-in-out',
    icon: 'ArrowUpDown',
    basePath: '/inventory',
    tab: 'stock-in-out',
    roles: ['inventory_staff'],
    type: 'Transaction',
    title: (r) => r.transaction_number,
    subtitle: (r) => r.product_name,
    searchText: (r) => [r.transaction_number, r.product_name, r.product_sku, r.reference_number].join(' '),
  },
  {
    key: 'inventory/damage-report',
    icon: 'AlertCircle',
    basePath: '/inventory',
    tab: 'damage-report',
    roles: ['inventory_staff'],
    type: 'Damage Report',
    title: (r) => r.product_name,
    subtitle: (r) => `${r.sku} · ${r.batch_number}`,
    searchText: (r) => [r.product_name, r.sku, r.batch_number, r.damage_type].join(' '),
  },
  {
    key: 'inventory/reservations',
    icon: 'Package',
    basePath: '/inventory',
    tab: 'reservations',
    roles: ['inventory_staff'],
    type: 'Reservation',
    title: (r) => r.order_number,
    subtitle: (r) => `${r.customer_name} · ${r.product_name}`,
    searchText: (r) => [r.order_number, r.customer_name, r.product_name].join(' '),
  },
  {
    key: 'inventory/expiry-alerts',
    icon: 'Calendar',
    basePath: '/inventory',
    tab: 'expiry-alerts',
    roles: ['inventory_staff'],
    type: 'Expiry Batch',
    title: (r) => r.product_name,
    subtitle: (r) => r.batch_number,
    searchText: (r) => [r.product_name, r.batch_number].join(' '),
  },
  {
    key: 'warehouse/receiving',
    icon: 'Truck',
    basePath: '/warehouse',
    tab: 'receiving',
    roles: ['warehouse'],
    type: 'Purchase Order',
    title: (r) => r.po_number,
    subtitle: (r) => r.supplier?.name,
    searchText: (r) => [r.po_number, r.supplier?.name, r.supplier?.contact_person].join(' '),
  },
  {
    key: 'warehouse/picking',
    icon: 'Package',
    basePath: '/warehouse',
    tab: 'picking',
    roles: ['warehouse'],
    type: 'Picking Task',
    title: (r) => r.order_number,
    subtitle: (r) => `${r.customer_name} · ${r.route}`,
    searchText: (r) => [r.order_number, r.customer_name, r.route].join(' '),
  },
  {
    key: 'warehouse/fefo',
    icon: 'Calendar',
    basePath: '/warehouse',
    tab: 'fefo',
    roles: ['warehouse'],
    type: 'FEFO Batch',
    title: (r) => r.batch_number,
    subtitle: (r) => r.product_name,
    searchText: (r) => [r.batch_number, r.product_name, r.product_sku, r.bin_location].join(' '),
  },
  {
    key: 'warehouse/discrepancies',
    icon: 'AlertCircle',
    basePath: '/warehouse',
    tab: 'discrepancies',
    roles: ['warehouse'],
    type: 'Discrepancy',
    title: (r) => r.report_number,
    subtitle: (r) => r.product_name,
    searchText: (r) => [r.report_number, r.product_name, r.product_sku, r.location].join(' '),
  },
  {
    key: 'manager/forecast',
    icon: 'FileBarChart',
    basePath: '/manager',
    tab: 'forecast',
    roles: [],
    type: 'Forecast',
    title: (r) => r.product_name,
    subtitle: (r) => r.sku,
    searchText: (r) => [r.product_name, r.sku].join(' '),
  },
  {
    key: 'manager/low-stock',
    icon: 'AlertCircle',
    basePath: '/manager',
    tab: 'low-stock',
    roles: [],
    type: 'Low Stock Alert',
    title: (r) => r.product_name,
    subtitle: (r) => r.sku,
    searchText: (r) => [r.product_name, r.sku].join(' '),
  },
  {
    key: 'manager/po-approvals',
    icon: 'ShoppingCart',
    basePath: '/manager',
    tab: 'po-approvals',
    roles: [],
    type: 'PO Approval',
    title: (r) => r.po_number,
    subtitle: (r) => r.supplier,
    searchText: (r) => [r.po_number, r.supplier, r.requested_by].join(' '),
  },
  {
    key: 'manager/users',
    icon: 'Users',
    basePath: '/manager',
    tab: 'users',
    roles: [],
    type: 'User',
    title: (r) => r.name,
    subtitle: (r) => r.email,
    searchText: (r) => [r.name, r.email, r.role_display].join(' '),
  },
]

function sourcesForRole(role) {
  if (role === 'manager') return SEARCH_SOURCES
  return SEARCH_SOURCES.filter((source) => source.roles.includes(role))
}

// Simple relevance: exact/startsWith matches on the title outrank a match
// found only in the subtitle or other search fields.
function scoreMatch(query, source, record) {
  const title = String(source.title(record) ?? '').toLowerCase()
  if (title === query) return 3
  if (title.startsWith(query)) return 2
  return 1
}

/**
 * Search every collection the given role can reach.
 * Returns up to `limit` results, most relevant first.
 */
export async function searchGlobal(query, role, { limit = 8 } = {}) {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  const sources = sourcesForRole(role)

  const perSourceResults = await Promise.all(
    sources.map(async (source) => {
      let records
      try {
        records = await listRecords(source.key, { delayMs: 0 })
      } catch {
        return []
      }

      return records
        .filter((record) => source.searchText(record).toLowerCase().includes(trimmed))
        .map((record) => ({
          id: `${source.key}:${record.id}`,
          recordId: record.id,
          type: source.type,
          icon: source.icon,
          title: source.title(record) ?? '(untitled)',
          subtitle: source.subtitle(record) ?? '',
          path: `${source.basePath}?tab=${source.tab}&highlight=${encodeURIComponent(record.id)}`,
          score: scoreMatch(trimmed, source, record),
        }))
    })
  )

  return perSourceResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
