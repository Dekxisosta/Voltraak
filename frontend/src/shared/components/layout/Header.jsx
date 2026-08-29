/**
 * Application header with search, notifications, and user menu
 */

import { useState } from 'react'
import { Menu, Search, User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileModal, PreferencesModal, GlobalSearchBar } from '@/components/common'
import LiveClock from './LiveClock'
import WeatherBadge from './WeatherBadge'



export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
  }

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface-card)] shadow-sm border-b border-[var(--color-border-primary)]">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] rounded"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search bar */}
          <div className="hidden sm:block ml-4 lg:ml-0 flex-1 max-w-md">
            <GlobalSearchBar />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Search button for mobile */}
          <button
            type="button"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="sm:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] rounded"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Weather + live clock */}
          <WeatherBadge />
          <LiveClock />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center space-x-3 p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] rounded max-w-[12rem]"
            >
              <img
                src="/assets/profile/profile.png"
                alt={user?.display_name || 'Profile'}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {user?.display_name}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {user?.role_display}
                </p>
              </div>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface-popover)] rounded-md shadow-lg py-1 z-50 border border-[var(--color-border-primary)]">
                {/* User info */}
                <div className="px-4 py-3 border-b border-[var(--color-border-primary)] min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {user?.display_name}
                  </p>
                  <p className="text-sm text-[var(--color-text-tertiary)] truncate">{user?.email}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] font-medium mt-1 truncate">
                    {user?.role_display}
                  </p>
                </div>

                {/* Menu items */}
                <button 
                  className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:bg-[var(--color-bg-tertiary)]"
                  onClick={() => {
                    setShowUserMenu(false)
                    setShowProfileModal(true)
                  }}
                >
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                
                <button 
                  className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:bg-[var(--color-bg-tertiary)]"
                  onClick={() => {
                    setShowUserMenu(false)
                    setShowPreferencesModal(true)
                  }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                </button>
                
                {/* Logout */}
                <div className="border-t border-[var(--color-border-primary)] mt-1">
                  <button 
                    className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] focus:outline-none focus:bg-[var(--color-danger-soft)]"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search panel */}
      {showMobileSearch && (
        <div className="sm:hidden px-4 pb-3">
          <GlobalSearchBar />
        </div>
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Profile modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Preferences modal */}
      <PreferencesModal isOpen={showPreferencesModal} onClose={() => setShowPreferencesModal(false)} />
    </header>
  )
}