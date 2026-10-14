/**
 * User Management Page - Manager
 * View users and edit their details (name, email, role).
 * Deactivation and deletion are admin-only — not available here.
 */

import { useState, useEffect } from 'react'
import { Users, Edit } from 'lucide-react'
import {
  Card,
  Table,
  StatusBadge,
  Button,
  Input,
  Select,
  SearchBar,
  LoadingSpinner,
  Modal,
  ModalBody,
  ModalFooter,
} from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { useAuth } from '@/shared/contexts/AuthContext'
import { fetchData, mutateData } from '@/shared/services/dataSource'
import { mockUsers } from '@/shared/mocks/manager/users'
import { usersApi, fetchAllUsers, extractUser, normalizeUser } from '@/shared/api/users'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'inventory_staff', label: 'Inventory Staff' },
  { value: 'warehouse', label: 'Warehouse Staff' },
]

// Mirrors UpdateUserRequest's name rule so the user gets feedback before a round-trip.
const NAME_RULE = /^[a-zA-Z\s\-'.]+$/

// Backend validation errors arrive as { field: [messages] }; the form wants { field: 'message' }.
const firstErrors = (errors = {}) =>
  Object.fromEntries(
    Object.entries(errors).map(([field, msgs]) => [field, Array.isArray(msgs) ? msgs[0] : String(msgs)])
  )

// Roles a managing user may assign / edit. Mirrors the backend rules
// (UpdateUserRequest + User::canManageRole): admins manage every role,
// managers manage warehouse and inventory staff only.
const ASSIGNABLE_ROLES = {
  admin: ['admin', 'manager', 'inventory_staff', 'warehouse'],
  manager: ['inventory_staff', 'warehouse'],
}

const emptyForm = { name: '', email: '', role: 'warehouse' }

export default function UserManagementPage() {
  const [data, setData] = useState({ users: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const { addNotification } = useNotifications()
  const { user: currentUser } = useAuth()
  const highlightRowId = useHighlightParam()

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      // fetchAllUsers walks every page of the paginated { data: { items, pagination } }
      // envelope and maps last_login_at -> last_login for the table.
      const users = await fetchData(
        () => mockUsers,
        () => fetchAllUsers()
      )
      setData({ users: Array.isArray(users) ? users.map(normalizeUser) : [], loading: false })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load users' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const isSelf = (user) => user && currentUser && String(user.id) === String(currentUser.id)

  // Whether the signed-in user may edit this row. The backend rejects edits of
  // roles the actor cannot manage, so hide the action rather than 403 on save.
  // A user may always edit their own name/email.
  const canEditUser = (user) => {
    if (isSelf(user)) return true
    const allowed = ASSIGNABLE_ROLES[currentUser?.role] || []
    return allowed.includes(user.role)
  }

  const roleOptions = ROLE_OPTIONS.filter(r =>
    (ASSIGNABLE_ROLES[currentUser?.role] || []).includes(r.value) || r.value === editingUser?.role
  )

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, role: user.role })
    setFormErrors({})
    setFormOpen(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setFormOpen(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    else if (!NAME_RULE.test(form.name.trim())) errors.name = 'Name can only contain letters, spaces, hyphens, apostrophes and periods'
    if (!form.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Enter a valid email address'
    } else {
      const duplicate = (data.users || []).find(
        u => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingUser?.id
      )
      if (duplicate) errors.email = 'A user with this email already exists'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    try {
      const roleLabel = ROLE_OPTIONS.find(r => r.value === form.role)?.label || form.role
      const name = form.name.trim()
      const email = form.email.trim().toLowerCase()

      // The backend ignores role on self-edits (and rejects unlisted keys), so only send name/email.
      const payload = isSelf(editingUser) ? { name, email } : { name, email, role: form.role }

      const updated = await mutateData(
        () => ({ ...editingUser, ...payload, role_display: roleLabel }),
        async () => normalizeUser(extractUser(await usersApi.updateUser(editingUser.id, payload)))
      )
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => (u.id === editingUser.id ? { ...u, ...updated } : u)),
      }))
      addNotification({ type: 'success', title: 'User Updated', message: `${name} has been updated` })
      setFormOpen(false)
    } catch (error) {
      if (error?.errors) {
        setFormErrors(firstErrors(error.errors))
      }
      addNotification({ type: 'error', title: 'Update Failed', message: error?.message || 'Failed to update user' })
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadge = (role) => {
    const map = {
      admin: { variant: 'critical', label: 'Admin' },
      manager: { variant: 'neutral', label: 'Manager' },
      inventory_staff: { variant: 'warning', label: 'Inventory' },
      warehouse: { variant: 'ok', label: 'Warehouse' },
    }
    const config = map[role] || { variant: 'neutral', label: role }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (val) => getRoleBadge(val) },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <StatusBadge variant={val ? 'ok' : 'neutral'} label={val ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (val) => (val ? new Date(val).toLocaleString() : 'Never'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) =>
        canEditUser(row) ? (
          <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>
            Edit
          </Button>
        ) : null,
    },
  ]

  const filteredUsers = (data.users || [])
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u =>
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading users..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="View and edit user details. Contact an administrator to deactivate or delete accounts."
        icon={Users}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{(data.users || []).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {(data.users || []).filter(u => u.is_active).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {(data.users || []).filter(u => u.role === 'manager').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name or email..."
              className="w-full sm:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              {['all', 'admin', 'manager', 'inventory_staff', 'warehouse'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    roleFilter === r
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'inventory_staff' ? 'Inventory' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Table
            data={filteredUsers}
            columns={columns}
            emptyMessage="No users found"
            highlightRowId={highlightRowId}
          />
        </Card.Body>
      </Card>

      {/* Edit User Modal */}
      <Modal isOpen={formOpen} onClose={closeFormModal} title="Edit User" size="md">
        <form onSubmit={handleSubmitForm}>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Full Name"
                required
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                error={formErrors.name}
                placeholder="Juan Dela Cruz"
              />
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                error={formErrors.email}
                placeholder="user@voltraak.com"
              />
              <Select
                label="Role"
                required
                value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                options={roleOptions}
                disabled={isSelf(editingUser)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeFormModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save Changes
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
