/**
 * FEFO (First Expired, First Out) Page - Warehouse Staff
 * Shows batch recommendations and expiry management
 */

import { useState, useEffect } from 'react'
import { Calendar, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockFEFORecommendations } from '@/shared/mocks/warehouse/fefo'
// TODO: import { inventoryApi } from '@/api'


export default function FEFOPage() {
  const [data, setData] = useState({
    recommendations: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      const result = await fetchData(
        () => mockFEFORecommendations,
        () => null // TODO: inventoryApi.getFEFORecommendations()
      )
      setData({ recommendations: result, loading: false })
    } catch (error) {
      console.error('Error loading FEFO recommendations:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load FEFO recommendations'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConfirmPickOrder = async (_batchId) => {
    try {
      addNotification({
        type: 'success',
        title: 'Pick Order Confirmed',
        message: 'FEFO recommendation has been applied to picking queue'
      })

      // Reload recommendations
      loadRecommendations()
    } catch (error) {
      console.error('Error confirming pick order:', error)
      addNotification({
        type: 'error',
        title: 'Confirmation Error',
        message: 'Failed to confirm pick order'
      })
    }
  }

  const handleMarkForDisposal = async (batchId) => {
    try {
      addNotification({
        type: 'warning',
        title: 'Marked for Disposal',
        message: 'Batch has been flagged for disposal review'
      })

      // Update batch status
      setData(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(rec => rec.id !== batchId)
      }))
    } catch (error) {
      console.error('Error marking for disposal:', error)
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to mark batch for disposal'
      })
    }
  }

  const getUrgencyBadge = (urgencyLevel, daysUntilExpiry) => {
    switch (urgencyLevel) {
      case 'critical':
        return <StatusBadge variant="critical" label={`${daysUntilExpiry} days`} icon={AlertTriangle} />
      case 'warning':
        return <StatusBadge variant="warning" label={`${daysUntilExpiry} days`} icon={Clock} />
      default:
        return <StatusBadge variant="ok" label={`${daysUntilExpiry} days`} icon={CheckCircle} />
    }
  }

  const getActionBadge = (action) => {
    switch (action) {
      case 'immediate_sale':
        return <StatusBadge variant="critical" label="Immediate Sale" />
      case 'priority_sale':
        return <StatusBadge variant="warning" label="Priority Sale" />
      case 'normal_rotation':
        return <StatusBadge variant="neutral" label="Normal Rotation" />
      default:
        return <StatusBadge variant="neutral" label="Review Required" />
    }
  }

  const columns = [
    {
      key: 'batch_number',
      label: 'Batch Number',
      sortable: true,
    },
    {
      key: 'product_name',
      label: 'Product',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.product_name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.product_sku}</div>
        </div>
      )
    },
    {
      key: 'quantity_available',
      label: 'Qty Available',
      render: (value, row) => (
        <div>
          <div className="font-medium">{value} units</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.bin_location}</div>
        </div>
      )
    },
    {
      key: 'expiry_date',
      label: 'Expiry Date',
      render: (value, row) => (
        <div>
          <div className="font-medium">{new Date(value).toLocaleDateString()}</div>
          {getUrgencyBadge(row.urgency_level, row.days_until_expiry)}
        </div>
      )
    },
    {
      key: 'total_value',
      label: 'Value',
      render: (value) => `₱${value.toLocaleString()}`
    },
    {
      key: 'recommended_action',
      label: 'Action',
      render: (value) => getActionBadge(value)
    },
    {
      key: 'actions',
      label: 'Controls',
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="primary"
            icon={CheckCircle}
            onClick={() => handleConfirmPickOrder(row.id)}
          >
            Confirm Order
          </Button>
          {row.urgency_level === 'critical' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleMarkForDisposal(row.id)}
            >
              Mark Disposal
            </Button>
          )}
        </div>
      )
    }
  ]

  const urgencyLevels = ['all', 'critical', 'warning', 'safe']
  const filteredRecommendations = data.recommendations.filter(rec => {
    const matchesSearch = rec.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.product_sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesUrgency = urgencyFilter === 'all' || rec.urgency_level === urgencyFilter
    return matchesSearch && matchesUrgency
  })

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading FEFO recommendations..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FEFO Recommendations"
        subtitle="First Expired, First Out batch management"
        icon={Calendar}
      />

      <Card>
        <Card.Body>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search products or batches..."
              className="flex-1 max-w-md"
            />
            
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="form-input w-full sm:w-auto"
            >
              {urgencyLevels.map(level => (
                <option key={level} value={level}>
                  {level === 'all' ? 'All Urgency Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Table
            data={filteredRecommendations}
            columns={columns}
            emptyMessage="No FEFO recommendations found"
            highlightRowId={highlightRowId}
          />
        </Card.Body>
      </Card>

      {/* Critical Items Alert */}
      {data.recommendations.some(rec => rec.urgency_level === 'critical') && (
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Critical Expiry Alert</h3>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <p className="text-red-700 dark:text-red-400">
                The following batches require immediate attention due to near expiry:
              </p>
              
              <div className="space-y-3">
                {data.recommendations
                  .filter(rec => rec.urgency_level === 'critical')
                  .map(rec => (
                    <div key={rec.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <div>
                        <div className="font-medium text-red-900 dark:text-red-200">{rec.product_name}</div>
                        <div className="text-sm text-red-700 dark:text-red-400">
                          Batch {rec.batch_number} • {rec.quantity_available} units • 
                          Expires {new Date(rec.expiry_date).toLocaleDateString()} ({rec.days_until_expiry} days)
                        </div>
                        {rec.notes && (
                          <div className="text-sm text-red-600 dark:text-red-400 mt-1">{rec.notes}</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConfirmPickOrder(rec.id)}
                        >
                          Priority Pick
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleMarkForDisposal(rec.id)}
                        >
                          Mark Disposal
                        </Button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.recommendations.filter(rec => rec.urgency_level === 'critical').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.recommendations.filter(rec => rec.urgency_level === 'warning').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Warning</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.recommendations.filter(rec => rec.urgency_level === 'safe').length}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Safe</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.recommendations.reduce((sum, rec) => sum + rec.total_value, 0).toLocaleString()}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value (₱)</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}