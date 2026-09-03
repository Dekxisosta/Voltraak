/**
 * Left navigation panel.
 *
 * Rendered inside the 220px left column of the AppShell body row.
 * The logo and user info now live in the Header, so this panel is
 * pure navigation: a role-scoped link list + a slim settings/logout strip
 * at the bottom.
 *
 * On mobile it is mounted inside a drawer overlay; `onClose` is passed in
 * that case to wire up the close button.
 */

import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  ListTodo,
  Package,
  Truck,
  Calendar,
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  ClipboardCheck,
  FileBarChart,
  Users,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils'
import PreferencesModal from '../common/PreferencesModal'

// ─── Role-based navigation config ────────────────────────────────────────────

const warehouseNavItems = [
  { label: 'Work Queue',         basePath: '/warehouse', tab: 'work-queue',          icon: ListTodo },
  { label: 'Receiving',          basePath: '/warehouse', tab: 'receiving',            icon: Truck },
  { label: 'Picking Lists',      basePath: '/warehouse', tab: 'picking',              icon: Package },
  { label: 'FEFO Management',    basePath: '/warehouse', tab: 'fefo',                 icon: Calendar },
  { label: 'Report Discrepancy', basePath: '/warehouse', tab: 'report-discrepancy',   icon: AlertCircle },
]

const inventoryNavItems = [
  { label: 'Work Queue',     basePath: '/inventory', tab: 'work-queue',    icon: ListTodo },
  { label: 'Stock In/Out',   basePath: '/inventory', tab: 'stock-in-out',  icon: ArrowUpDown },
  { label: 'Stock Levels',   basePath: '/inventory', tab: 'stock-levels',  icon: BarChart3 },
  { label: 'Damage Reports', basePath: '/inventory', tab: 'damage-report', icon: AlertCircle },
  { label: 'Item Updates',   basePath: '/inventory', tab: 'item-update',   icon: Package },
  { label: 'Reservations',   basePath: '/inventory', tab: 'reservations',  icon: Package },
  { label: 'Expiry Alerts',  basePath: '/inventory', tab: 'expiry-alerts', icon: Calendar },
  { label: 'Discrepancies',  basePath: '/inventory', tab: 'discrepancies', icon: AlertCircle },
]

const managerNavItems = [
  { label: 'Work Queue',          basePath: '/manager', tab: 'work-queue',            icon: ListTodo },
  { label: 'KPI Dashboard',       basePath: '/manager', tab: 'kpi',                   icon: TrendingUp },
  { label: 'Forecast Reports',    basePath: '/manager', tab: 'forecast',              icon: FileBarChart },
  { label: 'Inventory Reports',   basePath: '/manager', tab: 'reports',               icon: BarChart3 },
  { label: 'Low Stock Alerts',    basePath: '/manager', tab: 'low-stock',             icon: AlertCircle },
  { label: 'PO Approvals',        basePath: '/manager', tab: 'po-approvals',          icon: ShoppingCart },
  { label: 'Adjustment Approvals',basePath: '/manager', tab: 'adjustment-approvals',  icon: ClipboardCheck },
]

const adminNavItems = [
  { label: 'Work Queue',      basePath: '/admin', tab: 'work-queue', icon: ListTodo },
  { label: 'User Management', basePath: '/admin', tab: 'users',      icon: Users },
]

const getNavigationByRole = (role) => {
  const base = [{ label: 'Dashboard', basePath: '/dashboard', icon: LayoutDashboard }]
  if (role === 'warehouse')      return [...base, ...warehouseNavItems]
  if (role === 'inventory_staff') return [...base, ...inventoryNavItems]
  if (role === 'manager')        return [...base, ...managerNavItems]
  if (role === 'admin')          return [...base, ...adminNavItems, ...managerNavItems, ...inventoryNavItems, ...warehouseNavItems]
  return base
}

// ─── Section label helper ────────────────────────────────────────────────────

// Groups with a subtle uppercase label so the admin's long list stays scannable
const SECTION_LABELS = {
  '/dashboard':  null,          // no label for the single top item
  '/admin':      'Admin',
  '/manager':    'Manager',
  '/inventory':  'Inventory',
  '/warehouse':  'Warehouse',
}

function groupNavItems(items) {
  const groups = []
  let current = null

  for (const item of items) {
    const sectionKey = item.basePath
    const label = SECTION_LABELS[sectionKey] ?? null

    if (!current || current.basePath !== sectionKey) {
      current = { basePath: sectionKey, label, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [showPreferences, setShowPreferences] = useState(false)

  const navigation = getNavigationByRole(user?.role)
  const activeTab = searchParams.get('tab')

  const groups = groupNavItems(navigation)

  const handleLogout = async () => {
    try { await logout() } catch { /* force logout */ }
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Mobile close button ───────────────────────────────────── */}
      {onClose && (
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/10 lg:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/assets/logo/voltraak-logo.png"
              alt="Voltraak"
              className="w-6 h-6 rounded object-contain"
            />
            <span className="text-sm font-semibold text-white">Voltraak</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.basePath}>
            {/* Section label — only for multi-item groups that have a label */}
            {group.label && group.items.length > 1 && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.tab
                  ? location.pathname === item.basePath && activeTab === item.tab
                  : location.pathname === item.basePath

                return (
                  <NavItem
                    key={item.tab ? `${item.basePath}?tab=${item.tab}` : item.basePath}
                    item={item}
                    isActive={isActive}
                    onClick={onClose}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom strip ─────────────────────────────────────────── */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
        <button
          onClick={() => setShowPreferences(true)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Preferences</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>

      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </div>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({ item, isActive, onClick }) {
  const to = item.tab ? `${item.basePath}?tab=${item.tab}` : item.basePath

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20',
        isActive
          ? 'bg-white/15 text-white border-l-2 border-white pl-[calc(0.5rem-2px)]'
          : 'text-gray-400 hover:text-white hover:bg-white/10 border-l-2 border-transparent pl-[calc(0.5rem-2px)]'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}
