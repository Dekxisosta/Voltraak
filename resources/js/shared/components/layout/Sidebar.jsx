/**
 * Left navigation panel - Inertia version.
 */

import { Link, usePage } from '@inertiajs/react'
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

const warehouseNavItems = [
  { label: 'Work Queue',         href: '/warehouse?tab=work-queue',          icon: ListTodo },
  { label: 'Receiving',          href: '/warehouse?tab=receiving',            icon: Truck },
  { label: 'Picking Lists',      href: '/warehouse?tab=picking',              icon: Package },
  { label: 'FEFO Management',    href: '/warehouse?tab=fefo',                 icon: Calendar },
  { label: 'Report Discrepancy', href: '/warehouse?tab=report-discrepancy',   icon: AlertCircle },
]

const inventoryNavItems = [
  { label: 'Work Queue',     href: '/inventory?tab=work-queue',    icon: ListTodo },
  { label: 'Stock In/Out',   href: '/inventory?tab=stock-in-out',  icon: ArrowUpDown },
  { label: 'Stock Levels',   href: '/inventory?tab=stock-levels',  icon: BarChart3 },
  { label: 'Damage Reports', href: '/inventory?tab=damage-report', icon: AlertCircle },
  { label: 'Item Updates',   href: '/inventory?tab=item-update',   icon: Package },
  { label: 'Reservations',   href: '/inventory?tab=reservations',  icon: Package },
  { label: 'Expiry Alerts',  href: '/inventory?tab=expiry-alerts', icon: Calendar },
  { label: 'Discrepancies',  href: '/inventory?tab=discrepancies', icon: AlertCircle },
]

const managerNavItems = [
  { label: 'Work Queue',          href: '/manager?tab=work-queue',            icon: ListTodo },
  { label: 'KPI Dashboard',       href: '/manager?tab=kpi',                   icon: TrendingUp },
  { label: 'Forecast Reports',    href: '/manager?tab=forecast',              icon: FileBarChart },
  { label: 'Inventory Reports',   href: '/manager?tab=reports',               icon: BarChart3 },
  { label: 'Low Stock Alerts',    href: '/manager?tab=low-stock',             icon: AlertCircle },
  { label: 'PO Approvals',        href: '/manager?tab=po-approvals',          icon: ShoppingCart },
  { label: 'Adjustment Approvals',href: '/manager?tab=adjustment-approvals',  icon: ClipboardCheck },
]

const adminNavItems = [
  { label: 'Work Queue',      href: '/admin?tab=work-queue', icon: ListTodo },
  { label: 'User Management', href: '/admin?tab=users',      icon: Users },
]

const getNavigationByRole = (role) => {
  const base = [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }]
  if (role === 'warehouse')      return [...base, ...warehouseNavItems]
  if (role === 'inventory_staff') return [...base, ...inventoryNavItems]
  if (role === 'manager')        return [...base, ...managerNavItems]
  if (role === 'admin')          return [...base, ...adminNavItems, ...managerNavItems, ...inventoryNavItems, ...warehouseNavItems]
  return base
}

const SECTION_LABELS = {
  '/dashboard': null,
  '/admin': 'Admin',
  '/manager': 'Manager',
  '/inventory': 'Inventory',
  '/warehouse': 'Warehouse',
}

function groupNavItems(items) {
  const groups = []
  let current = null

  for (const item of items) {
    const sectionKey = item.href.split('?')[0]
    const label = SECTION_LABELS[sectionKey] ?? null

    if (!current || current.sectionKey !== sectionKey) {
      current = { sectionKey, label, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
}

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { url } = usePage()
  const [showPreferences, setShowPreferences] = useState(false)

  const navigation = getNavigationByRole(user?.role)
  const groups = groupNavItems(navigation)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-full flex-col">
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

      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.sectionKey}>
            {group.label && group.items.length > 1 && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = url === item.href || url.startsWith(item.href.split('?')[0] + '?')

                return (
                  <NavItem
                    key={item.href}
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

function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      href={item.href}
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
    </Link>
  )
}
