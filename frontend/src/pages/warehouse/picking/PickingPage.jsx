/**
 * Picking Page - Warehouse Staff
 * Shows picking lists organized by route with FEFO compliance
 */

import { useState, useEffect } from 'react'
import { Package, MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/components/common'
import { PageHeader } from '@/components/layout'
import { useNotifications } from '@/hooks/useNotifications'
import { fetchData } from '@/shared/services/dataSource'
import { mockPickingTasks } from './mocks'
// TODO: import { inventoryApi } from '@/api'


export default function PickingPage() {
  const [data, setData] = useState({
    pickingTasks: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('all')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadPickingTasks()
  }, [])

  const loadPickingTasks = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      const result = await fetchData(
        () => mockPickingTasks,
        () => null // TODO: inventoryApi.getProducts()
      )
      setData({ pickingTasks: result, loading: false })
    } catch (error) {
      console.error('Error loading picking tasks:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load picking tasks'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleMarkPicked = async (taskId, itemId) => {
    try {
      setData(prev => ({
        ...prev,
        pickingTasks: prev.pickingTasks.map(task => {
          if (task.id === taskId) {
            const updatedItems = task.items.map(item => 
              item.id === itemId ? { ...item, picked: true } : item
            )
            const allPicked = updatedItems.every(item => item.picked)
            return {
              ...task,
              items: updatedItems,
              status: allPicked ? 'completed' : 'in_progress'
            }
          }
          return task
        })
      }))

      addNotification({
        type: 'success',
        title: 'Item Picked',
        message: 'Item marked successfully'
      })
    } catch (error) {
      console.error('Error marking item:', error)
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to update picking status'
      })
    }
  }

  const handleCompleteOrder = async (taskId) => {
    try {
      setData(prev => ({
        ...prev,
        pickingTasks: prev.pickingTasks.map(task => 
          task.id === taskId ? { ...task, status: 'completed' } : task
        )
      }))

      addNotification({
        type: 'success',
        title: 'Order Completed',
        message: 'Picking task marked'
      })
    } catch (error) {
      console.error('Error completing order:', error)
      addNotification({
        type: 'error',
        title: 'Completion Error',
        message: 'Failed to complete picking task'
      })
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <StatusBadge variant="critical" label="High Priority" icon={AlertTriangle} />
      case 'medium':
        return <StatusBadge variant="warning" label="Medium Priority" icon={Clock} />
      default:
        return <StatusBadge variant="neutral" label="Normal Priority" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <StatusBadge variant="ok" label="Completed" icon={CheckCircle} />
      case 'in_progress':
        return <StatusBadge variant="warning" label="In Progress" icon={Package} />
      default:
        return <StatusBadge variant="neutral" label="Pending" icon={Clock} />
    }
  }

  const getExpiryStatus = (expiryDate) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry <= 60) {
      return <StatusBadge variant="warning" label={`${daysUntilExpiry} days`} />
    }
    return <StatusBadge variant="ok" label="Safe" />
  }

  const columns = [
    {
      key: 'order_number',
      label: 'Order Number',
      sortable: true,
    },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: true,
    },
    {
      key: 'route',
      label: 'Route',
      render: (value) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
          {value}
        </div>
      )
    },
    {
      key: 'items',
      label: 'Items',
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium">
            {row.items.filter(item => item.picked).length} / {row.items.length} picked
          </div>
          <div className="text-xs text-gray-500">
            {row.items.length} item{row.items.length > 1 ? 's' : ''} total
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => getPriorityBadge(value)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'due_time',
      label: 'Due Time',
      render: (value) => new Date(value).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          {row.status === 'in_progress' && row.items.every(item => item.picked) && (
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle}
              onClick={() => handleCompleteOrder(row.id)}
            >
              Complete
            </Button>
          )}
        </div>
      )
    }
  ]

  const routes = ['all', ...Array.from(new Set(data.pickingTasks.map(task => task.route)))]
  const filteredTasks = data.pickingTasks.filter(task => {
    const matchesSearch = task.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRoute = selectedRoute === 'all' || task.route === selectedRoute
    return matchesSearch && matchesRoute
  })

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading picking tasks..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Picking Lists"
        subtitle="Manage order picking with FEFO compliance"
        icon={Package}
      />

      <Card>
        <Card.Body>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search orders or customers..."
              className="flex-1 max-w-md"
            />
            
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="form-input w-full sm:w-auto"
            >
              {routes.map(route => (
                <option key={route} value={route}>
                  {route === 'all' ? 'All Routes' : route}
                </option>
              ))}
            </select>
          </div>

          <Table
            data={filteredTasks}
            columns={columns}
            emptyMessage="No picking tasks found"
          />
        </Card.Body>
      </Card>

      {/* Detailed Item View for Active Task */}
      {filteredTasks.find(task => task.status === 'in_progress') && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Active Picking Details</h3>
          </Card.Header>
          <Card.Body>
            {filteredTasks
              .filter(task => task.status === 'in_progress')
              .map(task => (
                <div key={task.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{task.order_number} - {task.customer_name}</h4>
                      <p className="text-sm text-gray-600">{task.route}</p>
                    </div>
                    {getPriorityBadge(task.priority)}
                  </div>

                  <div className="space-y-3">
                    {task.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{item.product_name}</h5>
                              <p className="text-sm text-gray-600">
                                Batch: {item.batch_number} | Qty: {item.quantity} | Location: {item.bin_location}
                              </p>
                            </div>
                            <div className="ml-4">
                              {getExpiryStatus(item.expiry_date)}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {item.picked ? (
                            <StatusBadge variant="ok" label="Picked" icon={CheckCircle} />
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleMarkPicked(task.id, item.id)}
                            >
                              Mark Picked
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </Card.Body>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Package className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.pickingTasks.filter(task => task.status === 'pending').length}
                </p>
                <p className="text-sm font-medium text-gray-600">Pending</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.pickingTasks.filter(task => task.status === 'in_progress').length}
                </p>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.pickingTasks.filter(task => task.status === 'completed').length}
                </p>
                <p className="text-sm font-medium text-gray-600">Completed</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.pickingTasks.filter(task => task.priority === 'high').length}
                </p>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}