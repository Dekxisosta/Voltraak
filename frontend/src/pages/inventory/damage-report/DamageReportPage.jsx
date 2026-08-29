/**
 * Damage Report Page - Inventory Staff
 * Track and report damaged inventory items
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, Camera, FileText } from 'lucide-react'
import { Card, Table, StatusBadge, Button, SearchBar, LoadingSpinner } from '@/shared/components/common'
import { PageHeader } from '@/shared/components/layout'
import { useNotifications } from '@/shared/hooks/useNotifications'
import { useHighlightParam } from '@/shared/hooks/useHighlightParam'
import { fetchData } from '@/shared/services/dataSource'
import { mockDamageReports } from '@/shared/mocks/inventory/damage-report'
// TODO: import { inventoryApi } from '@/api'

export default function DamageReportPage() {
  const [data, setData] = useState({ reports: [], loading: true })
  const [searchTerm, setSearchTerm] = useState('')
  const { addNotification } = useNotifications()
  const highlightRowId = useHighlightParam()

  useEffect(() => {
    loadDamageReports()
  }, [])

  const loadDamageReports = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      const result = await fetchData(
        () => mockDamageReports,
        () => null // TODO: inventoryApi.getDamageReports()
      )
      setData({ reports: result, loading: false })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load damage reports' })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const getSeverityBadge = (severity) => {
    const map = {
      minor: { variant: 'warning', label: 'Minor' },
      moderate: { variant: 'warning', label: 'Moderate' },
      severe: { variant: 'critical', label: 'Severe' },
    }
    const config = map[severity] || { variant: 'neutral', label: severity }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const getStatusBadge = (status) => {
    const map = {
      pending_review: { variant: 'warning', label: 'Pending Review' },
      under_investigation: { variant: 'warning', label: 'Investigating' },
      resolved: { variant: 'ok', label: 'Resolved' },
      written_off: { variant: 'critical', label: 'Written Off' },
    }
    const config = map[status] || { variant: 'neutral', label: status }
    return <StatusBadge variant={config.variant} label={config.label} />
  }

  const columns = [
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'batch_number', label: 'Batch' },
    { key: 'damage_type', label: 'Type' },
    { key: 'severity', label: 'Severity', render: (val) => getSeverityBadge(val) },
    { key: 'quantity_affected', label: 'Qty Affected' },
    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
    { key: 'reported_at', label: 'Reported', render: (val) => new Date(val).toLocaleDateString() },
  ]

  const filteredReports = data.reports.filter(r =>
    r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.damage_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (data.loading) {
    return <div className="flex items-center justify-center min-h-96"><LoadingSpinner size="lg" message="Loading damage reports..." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Damage Reports" subtitle="Track and manage damaged inventory" icon={AlertCircle} />

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search reports..." className="w-full sm:max-w-md" />
            <Button variant="primary" icon={Plus} className="w-full sm:w-auto">New Report</Button>
          </div>
          <Table data={filteredReports} columns={columns} emptyMessage="No damage reports found" highlightRowId={highlightRowId} />
        </Card.Body>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.filter(r => r.status === 'pending_review').length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.filter(r => r.status === 'under_investigation').length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Under Investigation</p>
              </div>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Camera className="h-6 w-6 text-gray-600 dark:text-gray-400" /></div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.reports.reduce((sum, r) => sum + r.quantity_affected, 0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items Affected</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
