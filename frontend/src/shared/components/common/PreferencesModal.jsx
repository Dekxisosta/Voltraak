/**
 * Preferences Modal - theme and display settings
 */

import { X, Sun, Moon, Monitor, RotateCcw, Maximize2, Minimize2, User, Mail, Lock, Save, Sliders, UserCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useDensity } from '@/shared/contexts/DensityContext'
import { useAuth } from '@/shared/contexts/AuthContext'
import { resetAllCollections } from '@/shared/services/mockStore'
import { dataSourceMode } from '@/shared/services/dataSource'
import { useNotifications } from '@/hooks/useNotifications'
import Input from './Input'
import Button from './Button'
import ProfileModal from './ProfileModal'

const themeOptions = [
  {
    id: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: Moon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: Monitor,
  },
]

const densityOptions = [
  {
    id: 'comfortable',
    label: 'Comfortable',
    description: 'More breathing room between rows',
    icon: Maximize2,
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tighter spacing, more on screen',
    icon: Minimize2,
  },
]

const TABS = [
  { id: 'display', label: 'Display', icon: Sliders },
  { id: 'account', label: 'Account', icon: UserCircle },
]

export default function PreferencesModal({ isOpen, onClose }) {
  const { preference, setTheme } = useTheme()
  const { density, setDensity } = useDensity()
  const { user, updateProfile } = useAuth()
  const { addNotification } = useNotifications()
  const [resetting, setResetting] = useState(false)
  const [activeTab, setActiveTab] = useState('display')

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  // Always open back on the Display tab
  useEffect(() => {
    if (isOpen) setActiveTab('display')
  }, [isOpen])

  if (!isOpen) return null

  const isProfileDirty =
    profileForm.name !== (user?.name || '') || profileForm.email !== (user?.email || '')

  const handleProfileChange = (field) => (e) => {
    setProfileForm(prev => ({ ...prev, [field]: e.target.value }))
    setProfileErrors(prev => ({ ...prev, [field]: undefined, form: undefined }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!isProfileDirty) return

    setSavingProfile(true)
    setProfileErrors({})
    try {
      await updateProfile({ name: profileForm.name, email: profileForm.email })
      addNotification({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile changes have been saved.',
      })
    } catch (error) {
      setProfileErrors({ form: error.message || 'Failed to update profile' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResetMockData = () => {
    setResetting(true)
    try {
      resetAllCollections()
      addNotification({
        type: 'success',
        title: 'Demo data reset',
        message: 'All mock records have been restored to their seed values.',
      })
    } finally {
      setResetting(false)
    }
  }

  // Portaled to <body>: this component is mounted deep inside the sidebar
  // tree, which is rendered before the header/notifications/etc in the DOM.
  // Without a portal, its z-50 overlay loses the stacking-order tie-break
  // to those later-mounted siblings and they show through undimmed.
  // z-[100] also puts it above every other floating layer in the app
  // (toasts, dropdowns) so it behaves like a true top-level modal.
  return createPortal(
    <div className="modal-overlay z-[100]" onClick={onClose}>
      <div
        className="modal-content flex flex-col"
        style={{ height: '640px', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border-primary)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Preferences
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6 flex-shrink-0" style={{ borderColor: 'var(--color-border-primary)' }}>
          <div className="flex space-x-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content — fixed-size shell, scrolls internally per tab */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'display' && (
            <>
              {/* Theme Section */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Appearance
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((option) => {
                    const isSelected = preference === option.id
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all"
                        style={{
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-primary)',
                          backgroundColor: isSelected ? 'var(--color-accent-soft)' : 'transparent',
                        }}
                      >
                        <Icon
                          className="h-6 w-6"
                          style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                        >
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {themeOptions.find(o => o.id === preference)?.description}
                </p>
              </div>

              {/* Density Section */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Density
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {densityOptions.map((option) => {
                    const isSelected = density === option.id
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => setDensity(option.id)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all"
                        style={{
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-primary)',
                          backgroundColor: isSelected ? 'var(--color-accent-soft)' : 'transparent',
                        }}
                      >
                        <Icon
                          className="h-6 w-6"
                          style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                        >
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {densityOptions.find(o => o.id === density)?.description}
                </p>
              </div>

              {/* Demo data section — only meaningful while running on mocks */}
              {dataSourceMode === 'mocks' && (
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    Demo Data
                  </h3>
                  <button
                    onClick={handleResetMockData}
                    disabled={resetting}
                    className="w-full flex items-center gap-2 p-3 rounded-lg border transition-colors disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border-primary)' }}
                  >
                    <RotateCcw className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Reset demo data
                    </span>
                  </button>
                  <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Discards any changes made to mock records (approvals, stock
                    transactions, discrepancy reports, etc.) and restores the
                    original sample data.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'account' && (
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Profile
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="flex items-center space-x-3 mb-1">
                  <img
                    src="/assets/profile/profile.png"
                    alt={user?.name || 'Profile'}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {user?.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                      {user?.role_display || user?.role}
                    </p>
                  </div>
                </div>

                <Input
                  id="prefs-profile-name"
                  label="Full name"
                  value={profileForm.name}
                  onChange={handleProfileChange('name')}
                  leftIcon={User}
                  required
                />

                <Input
                  id="prefs-profile-email"
                  type="email"
                  label="Email address"
                  value={profileForm.email}
                  onChange={handleProfileChange('email')}
                  leftIcon={Mail}
                  required
                />

                {profileErrors.form && (
                  <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{profileErrors.form}</p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Change password
                  </button>
                  <Button type="submit" variant="primary" size="sm" icon={Save} loading={savingProfile} disabled={!isProfileDirty}>
                    Save profile
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end flex-shrink-0" style={{ borderColor: 'var(--color-border-primary)' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Done
          </button>
        </div>
      </div>

      {/* Password change flow reuses the full Profile modal, opened straight
          to its Password tab, so we don't duplicate that form here. */}
      <ProfileModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        initialTab="password"
      />
    </div>,
    document.body
  )
}
