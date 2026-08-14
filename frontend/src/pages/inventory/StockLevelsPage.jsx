/**
 * Stock Levels Page - Inventory Staff
 * Monitor current stock levels and reorder points
 */

import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react'
import { PageHeader, Card, Table, StatusBadge, SearchBar, FilterPanel, LoadingSpinner } from '@/components/common'
import { useNotifications } from '@/hooks/useNotifications'
import type { TableColumn, ProductStockLevel } from '@/types'

interface StockLevelsPageData {
  stockLevels: ProductStockLevel[]
  loading: boolean
}

export default function StockLevelsPage() {
  const [data, setData] = useState<StockLevelsPageData>({
    stockLevels: [],
    loading: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadStockLevels()
  }, [])

  const loadStockLevels = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }))
      
      // Mock data for now - will be replaced with API call
      const mockData: ProductStockLevel[] = [
        {
          id: 1,
          product_name: 'Washing Machine WM-100',
          product_sku: 'WM-100-WHT',
          category: 'Washing Machines',
          current_stock: 3,
          minimum_stock: 5,
          reorder_point: 8,
          maximum_stock: 25,
          reserved_stock: 1,
          available_stock: 2,
          location: 'A-01-02',
          last_restock_date: '2024-08-10',
          supplier: 'ABC Electronics',
          unit_cost: 25000,
          total_value: 75000,
          turnover_rate: 2.5,
          status: 'critical'
        },
        {
          id: 2,
          product_name: 'Refrigerator RF-200',
          product_sku: 'RF-200-SLV',
          category: 'Refrigerators',
          current_stock: 12,
          minimum_stock: 6,
          reorder_point: 10,
          maximum_stock: 30,
          reserved_stock: 2,
          available_stock: 10,
          location: 'B-02-01',
          last_restock_date: '2024-08-08',
          supplier: 'Cool Appliances Inc',
          unit_cost: 35000,
          total_value: 420000,
          turnover_rate: 1.8,
          status: 'warning'
        },
        {
          id: 3,
          product_name: 'Air Conditioner AC-300',
          product_sku: 'AC-300-WHT',
          category: 'Air Conditioners',
          current_stock: 18,
          minimum_stock: 8,
          reorder_point: 12,
          maximum_stock: 40,
          reserved_stock: 0,
          available_stock: 18,
          location: 'C-01-03',
          last_restock_date: '2024-08-05',
          supplier: 'Climate Solutions',
          unit_cost: 42500,
          total_value: 765000,
          turnover_rate: 3.2,
          status: 'ok'
        },
        {
          id: 4,
          product_name: 'Dishwasher DW-400',
          product_sku: 'DW-400-BLK',
          category: 'Dishwashers',
          current_stock: 0,
          minimum_stock: 4,
          reorder_point: 6,
          maximum_stock: 20,
          reserved_stock: 0,
          available_stock: 0,
          location: 'D-01-01',
          last_restock_date: '2024-08-01',
          supplier: 'Kitchen Pro',
          unit_cost: 28000,
          total_value: 0,
          turnover_rate: 1.5,
          status: 'out_of_stock'
        }
      ]

      setTimeout(() => {
        setData({
          stockLevels: mockData,
          loading: false
        })
      }, 1000)
    } catch (error) {
      console.error('Error loading stock levels:', error)
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load stock levels'
      })
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <StatusBadge variant="critical" label="Out of Stock" icon={AlertTriangle} />
      case 'critical':
        return <StatusBadge variant="critical" label="Critical Low" icon={AlertTriangle} />
      case 'warning':
        return <StatusBadge variant="warning" label="Low Stock" icon={TrendingDown} />
      case 'ok':
        return <StatusBadge variant="ok" label="In Stock" icon={Package} />
      default:
        return <StatusBadge variant="neutral" label="Unknown" />
    }
  }

  const getStockBar = (current: number, minimum: number, reorder: number, maximum: number) => {
    const percentage = (current / maximum) * 100
    let barColor = 'bg-green-500'
    
    if (current <= 0) {
      barColor = 'bg-red-500'
    } else if (current <= minimum) {
      barColor = 'bg-red-500'
    } else if (current <= reorder) {
      barColor = 'bg-yellow-500'
    }

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{current}</span>
          <span>{maximum}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${barColor} h-2 rounded-full transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Min: {minimum}</span>
          <span>ROP: {reorder}</span>
        </div>
      </div>
    )
  }

  const getTurnoverBadge = (rate: number) => {
    if (rate >= 3) {
      return <StatusBadge variant="ok" label="High" />
    } else if (rate >= 2) {
      return <StatusBadge variant="warning" label="Medium" />
    } else {
      return <StatusBadge variant="critical" label="Low" />
    }
  }

  const columns: TableColumn<ProductStockLevel>[] = [
    {
      key: 'product_name',
      label: 'Product',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.product_name}</div>
          <div className="text-sm text-gray-500">{row.product_sku}</div>
          <div className="text-sm text-gray-500">{row.location}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'current_stock',
      label: 'Stock Level',
      render: (_, row) => (
        <div className="min-w-32">
          {getStockBar(row.current_stock, row.minimum_stock, row.reorder_point, row.maximum_stock)}
        </div>
      )
    },
    {
      key: 'available_stock',
      label: 'Available',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.available_stock} units</div>
          {row.reserved_stock > 0 && (
            <div className="text-sm text-yellow-600">
              {row.reserved_stock} reserved
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStockStatusBadge(value)
    },
    {
      key: 'total_value',
      label: 'Value',
      render: (value) => `₱${value.toLocaleString()}`
    },
    {
      key: 'turnover_rate',
      label: 'Turnover',
      render: (value) => (
        <div>
          <div className="font-medium">{value}x</div>
          {getTurnoverBadge(value)}
        </div>
      )
    },
    {
      key: 'last_restock_date',
      label: 'Last Restock',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ]

  const statusOptions = ['all', 'out_of_stock', 'critical', 'warning', 'ok']
  const categories = ['all', ...Array.from(new Set(data.stockLevels.map(item => item.category)))]
  
  const filteredStockLevels = data.stockLevels.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const totalValue = data.stockLevels.reduce((sum, item) => sum + item.total_value, 0)
  const lowStockItems = data.stockLevels.filter(item => item.status === 'critical' || item.status === 'warning').length
  const outOfStockItems = data.stockLevels.filter(item => item.status === 'out_of_stock').length

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message="Loading stock levels..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Levels"
        subtitle="Monitor inventory levels and reorder points"
        icon={BarChart3}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.stockLevels.length}
                </p>
                <p className="text-sm font-medium text-gray-600">Total SKUs</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(totalValue / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {lowStockItems}
                </p>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
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
                  {outOfStockItems}
                </p>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Stock Levels Table */}
      <Card>
        <Card.Body>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search products..."
              className="flex-1 max-w-md"
            />
            
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : 
                     status === 'out_of_stock' ? 'Out of Stock' :
                     status === 'critical' ? 'Critical Low' :
                     status === 'warning' ? 'Low Stock' :
                     status === 'ok' ? 'In Stock' : status}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-input"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Table
            data={filteredStockLevels}
            columns={columns}
            emptyMessage="No stock records found"
          />
        </Card.Body>
      </Card>

      {/* Critical Stock Alerts */}
      {data.stockLevels.some(item => item.status === 'critical' || item.status === 'out_of_stock') && (
        <Card>
          <Card.Header>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-800">Stock Alerts</h3>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {data.stockLevels
                .filter(item => item.status === 'critical' || item.status === 'out_of_stock')
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <div className="font-medium text-red-900">{item.product_name}</div>
                      <div className="text-sm text-red-700">
                        Current: {item.current_stock} | Minimum: {item.minimum_stock} | Location: {item.location}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStockStatusBadge(item.status)}
                    </div>
                  </div>
                ))
              }
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}