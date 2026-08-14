/**
 * Preferences Modal - theme and display settings
 */

import { X, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

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

export default function PreferencesModal({ isOpen, onClose }) {
  const { preference, setTheme } = useTheme()

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
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

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'var(--color-border-primary)' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
