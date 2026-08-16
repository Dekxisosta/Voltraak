/**
 * Reusable table component with sorting, loading states, and responsive design
 */

import React from 'react'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/utils'
import LoadingSpinner from './LoadingSpinner'


export default function Table({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onSort,
  sortOptions,
  className,
  striped = false,
  compact = false,
}) {
  const handleSort = (column) => {
    if (!column.sortable || !onSort) return

    const field = String(column.key)
    const currentDirection = sortOptions?.field === field ? sortOptions.direction : null
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
    
    onSort(field, newDirection)
  }

  const getSortIcon = (column) => {
    if (!column.sortable) return null

    const field = String(column.key)
    const isCurrentSort = sortOptions?.field === field

    if (isCurrentSort) {
      return sortOptions.direction === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    }

    return <ArrowUpDown className="h-4 w-4 opacity-50" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading data..." />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'table-header-cell',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 select-none',
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn('table-body', striped && 'divide-y-0')}>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'table-row',
                    striped && rowIndex % 2 === 1 && 'bg-gray-50'
                  )}
                >
                  {columns.map((column, colIndex) => {
                    const value = row[column.key]
                    const content = column.render ? column.render(value, row) : value

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          compact ? 'px-4 py-2' : 'table-cell',
                          column.className
                        )}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Higher-order component for tables with built-in state management
export function useTableSort(initialSort) {
  const [sortOptions, setSortOptions] = React.useState(initialSort)

  const handleSort = React.useCallback((field, direction) => {
    setSortOptions({ field, direction })
  }, [])

  return {
    sortOptions,
    handleSort,
    setSortOptions,
  }
}

// Responsive table wrapper for mobile devices
export function ResponsiveTable(props) {
  return (
    <div className="sm:hidden">
      {/* Mobile card layout */}
      <div className="space-y-4">
        {props.data.map((row, index) => (
          <div key={index} className="card">
            <div className="card-body space-y-2">
              {props.columns.map((column, colIndex) => {
                const value = row[column.key]
                const content = column.render ? column.render(value, row) : value

                return (
                  <div key={colIndex} className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {column.label}:
                    </span>
                    <span className="text-sm text-gray-900">{content}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Combined responsive and desktop table
export function AdaptiveTable(props) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table {...props} />
      </div>
      
      {/* Mobile cards */}
      <ResponsiveTable {...props} />
    </>
  )
}