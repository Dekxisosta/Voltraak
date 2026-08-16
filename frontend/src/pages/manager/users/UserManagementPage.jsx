/**
 * User Management Page - Manager
 * Create, edit, and manage system users and their roles
 */

import { useState, useEffect } from 'react'
import { Users, Plus, Edit, UserCheck, UserX } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockUsers } from '@/shared/mocks/manager/users'
// TODO: import { usersApi } from '@/api'

export default function UserManagementPage() {
  const [data, setData] = useState({ users: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const { addNotification } = useNotifications()

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

  const handleToggleActive = (user) => {
    const action = user.is_active ? 'deactivated' : 'activated'
    addNotification({ type: 'success', title: `User ${action}`, message: `${user.name} has been ${action}` })
    loadUsers()
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
        <Button size="sm" variant="secondary" icon={Edit}>Edit</Button>
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
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-gray-900">{data.users.length}</p><p className="text-sm text-gray-600">Total Users</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-green-600">{data.users.filter(u => u.is_active).length}</p><p className="text-sm text-gray-600">Active</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-blue-600">{data.users.filter(u => u.role === 'manager').length}</p><p className="text-sm text-gray-600">Managers</p></div></Card.Body></Card>
        <Card><Card.Body><div className="text-center"><p className="text-3xl font-bold text-purple-600">{data.users.filter(u => { const d = new Date(u.last_login); const now = new Date(); return (now - d) < 24 * 60 * 60 * 1000 }).length}</p><p className="text-sm text-gray-600">Active Today</p></div></Card.Body></Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex justify-between items-center mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or email..." className="max-w-md" />
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                {['all', 'manager', 'inventory_staff', 'warehouse'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1 text-sm rounded-full ${roleFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {r === 'all' ? 'All' : r === 'inventory_staff' ? 'Inventory' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <Button variant="primary" icon={Plus}>Add User</Button>
            </div>
          </div>
          <Table data={filteredUsers} columns={columns} emptyMessage="No users found" />
        </Card.Body>
      </Card>
    </div>
  )
}
