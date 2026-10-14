/**
 * Picking Page - Warehouse Staff
 * Shows picking lists organized by route with FEFO compliance
 */

import { useState, useEffect } from 'react'
import { Package, MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { fulfillCustomerOrder } from '@/shared/services/mockStore'
import { mockPickingTasks } from '@/shared/mocks/warehouse/picking'
import { inventoryApi } from '@/shared/api/inventory'


export default function PickingPage() {
  const [data, setData] = useState({
    pickingTasks: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('all')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadPickingTasks()
  }, [])

  const loadPickingTasks = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      const result = await fetchData(
        () => mockPickingTasks,
        async () => {
          const response = await inventoryApi.getPickingList()
          // Envelope: { success, message, data: { items: [...] } } -> picking tasks
          return transformPickingData(response)
        }
      )
      setData({ pickingTasks: result, loading: false })
    } catch (error) {
      console.error('Error loading picking tasks:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: error.message || 'Failed to load picking tasks'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  /**
   * Map the backend numeric priority score (base 50, +100 overdue, +50 due today,
   * +25 due soon) onto the page's high / medium / normal badges.
   */
  const mapPriority = (score) => {
    const value = Number(score)
    if (!Number.isFinite(value)) return 'medium'
    if (value >= 150) return 'high'
    if (value >= 100) return 'medium'
    return 'normal'
  }

  /**
   * Transform the backend picking list into the page's picking-task format.
   *
   * Backend: GET /customer-orders/picking/list ->
   *   { success, data: { items: [ one row per allocated reservation:
   *     { reservation_id, order_id, order_number, customer_name, required_date,
   *       priority (number), product_name, quantity, batch_number, bin_location,
   *       expiry_date, ... } ] } }
   * Frontend: one task per order, with its reservation rows as items[].
   */
  const transformPickingData = (response) => {
    const payload = response?.data ?? response
    const rows = Array.isArray(payload) ? payload : (payload?.items ?? [])

    const tasks = new Map()
    rows.forEach(row => {
      if (!tasks.has(row.order_id)) {
        tasks.set(row.order_id, {
          id: row.order_id,
          order_number: row.order_number,
          customer_name: row.customer_name || '',
          route: row.route || 'Route A', // Backend has no routes yet
          priority: mapPriority(row.priority),
          // Picking-list orders are confirmed; the picker starts them locally
          status: 'pending',
          due_time: row.required_date || null,
          items: [],
        })
      }
      tasks.get(row.order_id).items.push({
        id: row.reservation_id,
        product_name: row.product_name || 'Unknown Product',
        batch_number: row.batch_number || 'N/A',
        quantity: row.quantity,
        bin_location: row.bin_location || 'Unassigned',
        expiry_date: row.expiry_date || null,
        picked: false, // Tracked locally until the order is fulfilled
      })
    })

    return Array.from(tasks.values())
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
              status: allPicked ? 'in_progress' : 'in_progress' // Keep in_progress until completed
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

  const handleStartPicking = async (taskId) => {
    try {
      setData(prev => ({
        ...prev,
        pickingTasks: prev.pickingTasks.map(task => 
          task.id === taskId ? { ...task, status: 'in_progress' } : task
        )
      }))

      addNotification({
        type: 'success',
        title: 'Picking Started',
        message: 'Order picking has begun'
      })
    } catch (error) {
      console.error('Error starting picking:', error)
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to start picking'
      })
    }
  }

  const handleCompleteOrder = async (taskId) => {
    try {
      const task = data.pickingTasks.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')

      // Call the backend API to fulfill the order
      await fetchData(
        // Mock mode: use our stock operation helper
        () => {
          fulfillCustomerOrder(taskId, task.order_number)
          return { success: true }
        },
        // API mode: call real endpoint
        async () => {
          return await inventoryApi.fulfillCustomerOrder(taskId, {
            notes: 'Order picked and fulfilled from picking page'
          })
        }
      )

      // Update local state
      setData(prev => ({
        ...prev,
        pickingTasks: prev.pickingTasks.map(task => 
          task.id === taskId ? { ...task, status: 'completed' } : task
        )
      }))

      addNotification({
        type: 'success',
        title: 'Order Fulfilled',
        message: 'Order completed and inventory updated'
      })
    } catch (error) {
      console.error('Error completing order:', error)
      addNotification({
        type: 'error',
        title: 'Completion Error',
        message: error.message || 'Failed to complete picking task'
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
    if (!expiryDate) {
      return <StatusBadge variant="neutral" label="No expiry" />
    }
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
          <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
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
          <div className="text-xs text-gray-500 dark:text-gray-400">
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
      label: 'Due',
      render: (value) => {
        if (!value) return '—'
        // The API provides a date only (YYYY-MM-DD); mock data carries a full timestamp
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return new Date(`${value}T00:00:00`).toLocaleDateString()
        }
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          {/* Complete button: enabled when order is in_progress and all items are picked */}
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
          
          {/* Start Picking button: enabled when order is confirmed/pending */}
          {row.status === 'pending' && (
            <Button
              size="sm"
              variant="primary"
              icon={Package}
              onClick={() => handleStartPicking(row.id)}
            >
              Start Picking
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
            highlightRowId={highlightRowId}
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">{task.route}</p>
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
                              <p className="text-sm text-gray-600 dark:text-gray-400">
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
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.pickingTasks.filter(task => task.status === 'pending').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.pickingTasks.filter(task => task.status === 'in_progress').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.pickingTasks.filter(task => task.status === 'completed').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.pickingTasks.filter(task => task.priority === 'high').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Priority</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}