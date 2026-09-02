/**
 * Application header — full-width top navbar with logo, search, and user menu.
 * Logo sits in the left brand zone; search spans the centre; weather/clock/user
 * are pinned to the right. On mobile the nav drawer is triggered via the
 * hamburger that appears in the brand zone.
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
    <header className="sticky top-0 z-30 bg-[var(--color-glass-header)] border-b border-[var(--color-glass-border)] shadow-[var(--shadow-glass)] backdrop-blur-xl" style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)', backdropFilter: 'blur(20px) saturate(180%)' }}>
      <div className="flex items-center h-14 px-4 gap-3">

        {/* ── Brand zone ─────────────────────────────────────────────── */}
        {/* Fixed-width column matching the left nav panel width (220px) */}
        <div className="flex items-center gap-3 w-[220px] shrink-0">
          {/* Mobile hamburger — replaces logo area on small screens */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo + wordmark — desktop only */}
          <div className="hidden lg:flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/logo/voltraak-logo.png"
              alt="Voltraak"
              className="w-8 h-8 shrink-0 object-contain"
            />
            <div className="leading-tight min-w-0">
              <p className="text-sm font-semibold text-white truncate">Voltraak</p>
              <p className="text-[10px] text-gray-400 truncate">Inventory Management</p>
            </div>
          </div>
        </div>

        {/* ── Search — centre ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <GlobalSearchBar dark />
        </div>

        {/* ── Right controls ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="sm:hidden p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded"
            aria-label="Toggle search"
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
              className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors max-w-[12rem]"
            >
              <img
                src="/assets/profile/profile.png"
                alt={user?.display_name || 'Profile'}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
              />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-white truncate leading-tight">
                  {user?.display_name}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">
                  {user?.role_display}
                </p>
              </div>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl py-1 z-50 border border-[var(--color-glass-border)] shadow-[var(--shadow-glass)]" style={{ background: 'var(--color-glass-popover)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
                {/* User info */}
                <div className="px-4 py-3 border-b border-[var(--color-glass-border)] min-w-0">
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
                <div className="border-t border-[var(--color-glass-border)] mt-1">
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
        <div className="sm:hidden px-4 pb-3 border-t border-white/10">
          <GlobalSearchBar dark />
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