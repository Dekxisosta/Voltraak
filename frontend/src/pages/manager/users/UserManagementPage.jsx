/**
 * User Management Page - Manager
 * Create, edit, and manage system users and their roles
 */

import { useState, useEffect } from 'react'
import { Users, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { Card, Table, StatusBadge, Button, Input, Select, SearchBar, LoadingSpinner, Modal, ModalBody, ModalFooter, ConfirmModal } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockUsers } from '@/shared/mocks/manager/users'
// TODO: import { usersApi } from '@/api'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'inventory_staff', label: 'Inventory Staff' },
  { value: 'warehouse', label: 'Warehouse Staff' },
]

const emptyForm = { name: '', email: '', role: 'warehouse', is_active: true }

export default function UserManagementPage() {
  const [data, setData] = useState({ users: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  // Add/Edit modal state. `editingUser` is null when adding, otherwise the
  // user object being edited.
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Per-row toggle active/inactive pending state
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockUsers,
        () => null // TODO: usersApi.getUsers()
      )
      setData({ users: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load users' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleToggleActive = async (user) => {
    setTogglingId(user.id)
    try {
      const action = user.is_active ? 'deactivated' : 'activated'
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u)
      }))
      addNotification({ type: 'success', title: `User ${action}`, message: `${user.name} has been ${action}` })
    } finally {
      setTogglingId(null)
    }
  }

  const openAddModal = () => {
    setEditingUser(null)
    setForm(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, role: user.role, is_active: user.is_active })
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
    if (!form.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Enter a valid email address'
    } else {
      const duplicate = data.users.find(
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

      if (editingUser) {
        setData(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === editingUser.id
            ? { ...u, name: form.name.trim(), email: form.email.trim(), role: form.role, role_display: roleLabel, is_active: form.is_active }
            : u)
        }))
        addNotification({ type: 'success', title: 'User Updated', message: `${form.name} has been updated` })
      } else {
        const newUser = {
          id: Math.max(0, ...data.users.map(u => u.id)) + 1,
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          role_display: roleLabel,
          is_active: form.is_active,
          last_login: null,
          created_at: new Date().toISOString(),
        }
        setData(prev => ({ ...prev, users: [newUser, ...prev.users] }))
        addNotification({ type: 'success', title: 'User Added', message: `${form.name} has been added as ${roleLabel}` })
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== deleteTarget.id) }))
      addNotification({ type: 'success', title: 'User Removed', message: `${deleteTarget.name} has been removed` })
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
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
    { key: 'is_active', label: 'Status', render: (val) => <StatusBadge variant={val ? 'ok' : 'neutral'} label={val ? 'Active' : 'Inactive'} /> },
    { key: 'last_login', label: 'Last Login', render: (val) => val ? new Date(val).toLocaleString() : 'Never' },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Edit} disabled={togglingId === row.id || deleting} onClick={() => openEditModal(row)}>Edit</Button>
        <Button size="sm" variant={row.is_active ? 'danger' : 'primary'} icon={row.is_active ? UserX : UserCheck} loading={togglingId === row.id} disabled={togglingId === row.id || deleting} onClick={() => handleToggleActive(row)}>
          {row.is_active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="danger" icon={Trash2} disabled={togglingId === row.id || deleting} onClick={() => setDeleteTarget(row)}>Delete</Button>
      </div>
    )},
  ]

  const filteredUsers = data.users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading users..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle="Manage system users and access control" icon={Users} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.users.length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.users.filter(u => u.is_active).length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Active</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.users.filter(u => u.role === 'manager').length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Managers</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.users.filter(u => { const d = new Date(u.last_login); const now = new Date(); return (now - d) < 24 * 60 * 60 * 1000 }).length}</p><p className="text-sm text-gray-600 dark:text-gray-400">Active Today</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or email..." className="w-full sm:max-w-md" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {['all', 'admin', 'manager', 'inventory_staff', 'warehouse'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1 text-sm rounded-full ${roleFilter === r ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {r === 'all' ? 'All' : r === 'inventory_staff' ? 'Inventory' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <Button variant="primary" icon={Plus} onClick={openAddModal}>Add User</Button>
            </div>
          </div>
          <Table data={filteredUsers} columns={columns} emptyMessage="No users found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal isOpen={formOpen} onClose={closeFormModal} title={editingUser ? 'Edit User' : 'Add User'} size="md">
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
                options={ROLE_OPTIONS}
              />
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeFormModal} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>{editingUser ? 'Save Changes' : 'Add User'}</Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleting(false) || setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove User"
        message={deleteTarget ? `Are you sure you want to remove ${deleteTarget.name}? This cannot be undone.` : ''}
        confirmText="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
