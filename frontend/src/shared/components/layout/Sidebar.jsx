/**
 * Application sidebar with navigation menu
 */

import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { 
  LayoutDashboard,
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
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils'
import PreferencesModal from '../common/PreferencesModal'


// Role-based navigation configuration
//
// Roles:
//   warehouse        - warehouse tabs only
//   inventory_staff   - inventory tabs only
//   manager           - manager-exclusive tabs only (KPI, forecast, reports,
//                       low-stock, approvals) — no operational tabs
//   admin             - every tab in the app plus admin-only account management
const warehouseNavItems = [
  {
    label: 'Receiving',
    basePath: '/warehouse',
    tab: 'receiving',
    icon: Truck,
    roles: ['warehouse', 'admin'],
  },
  {
    label: 'Picking Lists',
    basePath: '/warehouse',
    tab: 'picking',
    icon: Package,
    roles: ['warehouse', 'admin'],
  },
  {
    label: 'FEFO Management',
    basePath: '/warehouse',
    tab: 'fefo',
    icon: Calendar,
    roles: ['warehouse', 'admin'],
  },
  {
    label: 'Report Discrepancy',
    basePath: '/warehouse',
    tab: 'report-discrepancy',
    icon: AlertCircle,
    roles: ['warehouse', 'admin'],
  },
]

const inventoryNavItems = [
  {
    label: 'Stock In/Out',
    basePath: '/inventory',
    tab: 'stock-in-out',
    icon: ArrowUpDown,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Stock Levels',
    basePath: '/inventory',
    tab: 'stock-levels',
    icon: BarChart3,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Damage Reports',
    basePath: '/inventory',
    tab: 'damage-report',
    icon: AlertCircle,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Item Updates',
    basePath: '/inventory',
    tab: 'item-update',
    icon: Package,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Reservations',
    basePath: '/inventory',
    tab: 'reservations',
    icon: Package,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Expiry Alerts',
    basePath: '/inventory',
    tab: 'expiry-alerts',
    icon: Calendar,
    roles: ['inventory_staff', 'admin'],
  },
  {
    label: 'Discrepancies',
    basePath: '/inventory',
    tab: 'discrepancies',
    icon: AlertCircle,
    roles: ['inventory_staff', 'admin'],
  },
]

const managerNavItems = [
  {
    label: 'KPI Dashboard',
    basePath: '/manager',
    tab: 'kpi',
    icon: TrendingUp,
    roles: ['manager', 'admin'],
  },
  {
    label: 'Forecast Reports',
    basePath: '/manager',
    tab: 'forecast',
    icon: FileBarChart,
    roles: ['manager', 'admin'],
  },
  {
    label: 'Inventory Reports',
    basePath: '/manager',
    tab: 'reports',
    icon: BarChart3,
    roles: ['manager', 'admin'],
  },
  {
    label: 'Low Stock Alerts',
    basePath: '/manager',
    tab: 'low-stock',
    icon: AlertCircle,
    roles: ['manager', 'admin'],
  },
  {
    label: 'PO Approvals',
    basePath: '/manager',
    tab: 'po-approvals',
    icon: ShoppingCart,
    roles: ['manager', 'admin'],
  },
  {
    label: 'Adjustment Approvals',
    basePath: '/manager',
    tab: 'adjustment-approvals',
    icon: ClipboardCheck,
    roles: ['manager', 'admin'],
  },
]

// Admin-only — user account management
const adminNavItems = [
  {
    label: 'User Management',
    basePath: '/admin',
    tab: 'users',
    icon: Users,
    roles: ['admin'],
  },
]

const getNavigationByRole = (role) => {
  const baseNavigation = [
    {
      label: 'Dashboard',
      basePath: '/dashboard',
      icon: LayoutDashboard,
    },
  ]

  if (role === 'warehouse') {
    return [...baseNavigation, ...warehouseNavItems]
  }

  if (role === 'inventory_staff') {
    return [...baseNavigation, ...inventoryNavItems]
  }

  if (role === 'manager') {
    // Manager is scoped to manager-only tabs — no warehouse/inventory tabs.
    return [...baseNavigation, ...managerNavItems]
  }

  if (role === 'admin') {
    // Admin sees every tab in the app, to showcase all features.
    return [...baseNavigation, ...adminNavItems, ...managerNavItems, ...inventoryNavItems, ...warehouseNavItems]
  }

  return baseNavigation
}

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [showPreferences, setShowPreferences] = useState(false)

  // Get role-based navigation
  const navigation = getNavigationByRole(user?.role)
  const activeTab = searchParams.get('tab')

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout anyway
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar-bg">
      {/* Logo and close button */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-hover">
        <div className="flex items-center">
          <img
            src="/assets/logo/voltraak-logo.png"
            alt="Voltraak"
            className="w-8 h-8 rounded-md object-contain"
          />
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-sidebar-text">Voltraak</h1>
            <p className="text-xs text-gray-400">IMS</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info */}
      {user && (
        <div className="p-4 border-b border-sidebar-hover">
          <div className="flex items-center">
            <img
              src="/assets/profile/profile.png"
              alt={user.name || 'Profile'}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-sidebar-text truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.role_display || user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4 space-y-1">
        {navigation.map((item) => {
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
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-sidebar-hover">
        <div className="space-y-1">
          <button
            onClick={() => setShowPreferences(true)}
            className="w-full nav-link text-left text-gray-400 hover:text-white hover:bg-sidebar-hover"
          >
            <Settings className="h-5 w-5" />
            Preferences
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full nav-link text-left text-gray-400 hover:text-white hover:bg-sidebar-hover"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>

      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </div>
  )
}



function NavItem({ item, isActive, onClick }) {
  const to = item.tab ? `${item.basePath}?tab=${item.tab}` : item.basePath

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'nav-link transition-colors',
        isActive
          ? 'bg-sidebar-hover text-white border-l-2 border-white pl-[calc(0.75rem-2px)]'
          : 'text-gray-400 hover:text-white hover:bg-sidebar-hover border-l-2 border-transparent pl-[calc(0.75rem-2px)]'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  )
}