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
const getNavigationByRole = (role) => {
  const baseNavigation = [
    {
      label: 'Dashboard',
      basePath: '/dashboard',
      icon: LayoutDashboard,
    },
  ]

  if (role === 'warehouse') {
    return [
      ...baseNavigation,
      {
        label: 'Receiving',
        basePath: '/warehouse',
        tab: 'receiving',
        icon: Truck,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'Picking Lists',
        basePath: '/warehouse',
        tab: 'picking',
        icon: Package,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'FEFO Management',
        basePath: '/warehouse',
        tab: 'fefo',
        icon: Calendar,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'Discrepancies',
        basePath: '/warehouse',
        tab: 'discrepancies',
        icon: AlertCircle,
        roles: ['warehouse', 'manager'],
      },
    ]
  }

  if (role === 'inventory_staff') {
    return [
      ...baseNavigation,
      {
        label: 'Stock In/Out',
        basePath: '/inventory',
        tab: 'stock-in-out',
        icon: ArrowUpDown,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Stock Levels',
        basePath: '/inventory',
        tab: 'stock-levels',
        icon: BarChart3,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Damage Reports',
        basePath: '/inventory',
        tab: 'damage-report',
        icon: AlertCircle,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Item Updates',
        basePath: '/inventory',
        tab: 'item-update',
        icon: Package,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Reservations',
        basePath: '/inventory',
        tab: 'reservations',
        icon: Package,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Expiry Alerts',
        basePath: '/inventory',
        tab: 'expiry-alerts',
        icon: Calendar,
        roles: ['inventory_staff', 'manager'],
      },
    ]
  }

  if (role === 'manager') {
    return [
      ...baseNavigation,
      // Manager-exclusive tabs come first
      {
        label: 'KPI Dashboard',
        basePath: '/manager',
        tab: 'kpi',
        icon: TrendingUp,
        roles: ['manager'],
      },
      {
        label: 'Forecast Reports',
        basePath: '/manager',
        tab: 'forecast',
        icon: FileBarChart,
        roles: ['manager'],
      },
      {
        label: 'Inventory Reports',
        basePath: '/manager',
        tab: 'reports',
        icon: BarChart3,
        roles: ['manager'],
      },
      {
        label: 'Low Stock Alerts',
        basePath: '/manager',
        tab: 'low-stock',
        icon: AlertCircle,
        roles: ['manager'],
      },
      {
        label: 'PO Approvals',
        basePath: '/manager',
        tab: 'po-approvals',
        icon: ShoppingCart,
        roles: ['manager'],
      },
      {
        label: 'User Management',
        basePath: '/manager',
        tab: 'users',
        icon: Users,
        roles: ['manager'],
      },
      // Inventory staff tabs
      {
        label: 'Stock In/Out',
        basePath: '/inventory',
        tab: 'stock-in-out',
        icon: ArrowUpDown,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Stock Levels',
        basePath: '/inventory',
        tab: 'stock-levels',
        icon: BarChart3,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Damage Reports',
        basePath: '/inventory',
        tab: 'damage-report',
        icon: AlertCircle,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Item Updates',
        basePath: '/inventory',
        tab: 'item-update',
        icon: Package,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Reservations',
        basePath: '/inventory',
        tab: 'reservations',
        icon: Package,
        roles: ['inventory_staff', 'manager'],
      },
      {
        label: 'Expiry Alerts',
        basePath: '/inventory',
        tab: 'expiry-alerts',
        icon: Calendar,
        roles: ['inventory_staff', 'manager'],
      },
      // Warehouse staff tabs
      {
        label: 'Receiving',
        basePath: '/warehouse',
        tab: 'receiving',
        icon: Truck,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'Picking Lists',
        basePath: '/warehouse',
        tab: 'picking',
        icon: Package,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'FEFO Management',
        basePath: '/warehouse',
        tab: 'fefo',
        icon: Calendar,
        roles: ['warehouse', 'manager'],
      },
      {
        label: 'Discrepancies',
        basePath: '/warehouse',
        tab: 'discrepancies',
        icon: AlertCircle,
        roles: ['warehouse', 'manager'],
      },
    ]
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
          <div className="w-8 h-8 bg-amber-800 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
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
            <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
              </span>
            </div>
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
          ? 'bg-amber-800 text-white'
          : 'text-gray-300 hover:text-white hover:bg-sidebar-hover'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  )
}