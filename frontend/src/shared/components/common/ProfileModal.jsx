/**
 * Profile Modal
 *
 * Lets the current user view their account details, edit name/email, and
 * change their password. Opened from the header's user menu.
 */

import { useState } from 'react'
import { User, Mail, Shield, Calendar, Lock, Save } from 'lucide-react'
import { Modal, ModalBody, ModalFooter, Input, Button } from '@/shared/components/common'
import { useAuth } from '@/shared/contexts/AuthContext'
import { formatDate } from '@/shared/utils'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
]

export default function ProfileModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile')

  const handleClose = () => {
    setActiveTab('profile')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="My Profile" size="md">
      <div className="border-b border-[var(--color-border-primary)] px-6">
        <div className="flex space-x-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' ? (
        <ProfileTab onClose={handleClose} />
      ) : (
        <PasswordTab onClose={handleClose} />
      )}
    </Modal>
  )
}

function ProfileTab({ onClose }) {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isDirty = form.name !== (user?.name || '') || form.email !== (user?.email || '')

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isDirty) return

    setSaving(true)
    setErrors({})
    try {
      await updateProfile({ name: form.name, email: form.email })
    } catch (error) {
      setErrors({ form: error.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalBody>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-[var(--color-accent)] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--color-text-inverse)] text-xl font-medium">
              {user?.initials || user?.name?.charAt(0) || <User className="h-6 w-6" />}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-medium text-[var(--color-text-primary)] truncate">{user?.name}</p>
            <p className="text-sm text-[var(--color-text-tertiary)] truncate">{user?.role_display || user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            id="profile-name"
            label="Full name"
            value={form.name}
            onChange={handleChange('name')}
            leftIcon={User}
            required
          />

          <Input
            id="profile-email"
            type="email"
            label="Email address"
            value={form.email}
            onChange={handleChange('email')}
            leftIcon={Mail}
            required
          />

          {errors.form && (
            <p className="text-sm text-[var(--color-danger)]">{errors.form}</p>
          )}

          <div className="pt-2 border-t border-[var(--color-border-primary)] space-y-2">
            <div className="flex items-center text-sm text-[var(--color-text-tertiary)]">
              <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Role: <span className="font-medium text-[var(--color-text-secondary)]">{user?.role_display || user?.role}</span></span>
            </div>
            {user?.created_at && (
              <div className="flex items-center text-sm text-[var(--color-text-tertiary)]">
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Member since {formatDate(user.created_at)}</span>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={Save} loading={saving} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </ModalFooter>
    </form>
  )
}

function PasswordTab({ onClose }) {
  const { changePassword } = useAuth()
  const [form, setForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined, form: undefined }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.current_password) nextErrors.current_password = 'Enter your current password'
    if (!form.password || form.password.length < 8) {
      nextErrors.password = 'New password must be at least 8 characters'
    }
    if (form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match'
    }
    return nextErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      await changePassword(form)
      setForm({ current_password: '', password: '', password_confirmation: '' })
      onClose()
    } catch (error) {
      setErrors({ form: error.message || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalBody>
        <div className="space-y-4">
          <Input
            id="current-password"
            type="password"
            label="Current password"
            value={form.current_password}
            onChange={handleChange('current_password')}
            error={errors.current_password}
            leftIcon={Lock}
            required
          />

          <Input
            id="new-password"
            type="password"
            label="New password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            helpText="At least 8 characters"
            leftIcon={Lock}
            required
          />

          <Input
            id="confirm-password"
            type="password"
            label="Confirm new password"
            value={form.password_confirmation}
            onChange={handleChange('password_confirmation')}
            error={errors.password_confirmation}
            leftIcon={Lock}
            required
          />

          {errors.form && (
            <p className="text-sm text-[var(--color-danger)]">{errors.form}</p>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={Lock} loading={saving}>
            Change Password
          </Button>
        </div>
      </ModalFooter>
    </form>
  )
}
