/**
 * User Management Page - Manager
 * Create, edit, and manage system users and their roles
 */

import { useState, useEffect } from 'react'
import { Users, Plus, Edit, UserCheck, UserX } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import Modal, { ModalBody, ModalFooter } from '@/shared/components/common/Modal'
import Input from '@/shared/components/common/Input'
import Select, { RoleSelect } from '@/shared/components/common/Select'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { createResourceDataSource } from '@/shared/services/dataSource'
// TODO: pass { api: usersApi } once the endpoint exists
const usersSource = createResourceDataSource('manager/users')

const EMPTY_FORM = { name: '', email: '', role: 'inventory_staff', is_active: true }

export default function UserManagementPage() {
  const [data, setData] = useState({ users: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null) // null = creating
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await usersSource.list()
      setData({ users: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load users' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'deactivated' : 'activated'
    try {
      await usersSource.update(user.id, { is_active: !user.is_active })
      addNotification({ type: 'success', title: `User ${action}`, message: `${user.name} has been ${action}` })
      loadUsers()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to update ${user.name}` })
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, role: user.role, is_active: user.is_active })
    setFormErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    try {
      if (editingUser) {
        await usersSource.update(editingUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          is_active: form.is_active,
        })
        addNotification({ type: 'success', title: 'User Updated', message: `${form.name} has been updated` })
      } else {
        await usersSource.create({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          is_active: form.is_active,
          last_login: null,
          created_at: new Date().toISOString().slice(0, 10),
        })
        addNotification({ type: 'success', title: 'User Added', message: `${form.name} has been added` })
      }
      setModalOpen(false)
      loadUsers()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: `Failed to save user` })
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadge = (role) => {
    const map = {
      manager: { variant: 'critical', label: 'Manager' },
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
      <div className="flex space-x-2">
        <Button size="sm" variant="secondary" icon={Edit} onClick={() => openEditModal(row)}>Edit</Button>
        <Button size="sm" variant={row.is_active ? 'danger' : 'primary'} icon={row.is_active ? UserX : UserCheck} onClick={() => handleToggleActive(row)}>
          {row.is_active ? 'Deactivate' : 'Activate'}
        </Button>
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
                {['all', 'manager', 'inventory_staff', 'warehouse'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1 text-sm rounded-full ${roleFilter === r ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {r === 'all' ? 'All' : r === 'inventory_staff' ? 'Inventory' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <Button variant="primary" icon={Plus} onClick={openCreateModal}>Add User</Button>
            </div>
          </div>
          <Table data={filteredUsers} columns={columns} emptyMessage="No users found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingUser ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={handleSave}>
          <ModalBody>
            <div className="space-y-4">
              <Input
                id="user-name"
                label="Full Name"
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                error={formErrors.name}
                placeholder="e.g. Juan Dela Cruz"
              />
              <Input
                id="user-email"
                type="email"
                label="Email"
                required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                error={formErrors.email}
                placeholder="name@voltraak.com"
              />
              <RoleSelect
                id="user-role"
                label="Role"
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
              />
              <Select
                id="user-status"
                label="Status"
                value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" variant="primary" loading={saving} icon={editingUser ? Edit : Plus} className="w-full sm:w-auto">
                {editingUser ? 'Save Changes' : 'Add User'}
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}