/**
 * Reusable filter panel component for data filtering
 */

import React from 'react'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '@/utils'
import Button from './Button'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: Record<string, any>) => void
  onReset: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

interface FilterGroupProps {
  title: string
  children: React.ReactNode
  className?: string
}

interface FilterFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export default function FilterPanel({
  isOpen,
  onClose,
  onApply,
  onReset,
  title = 'Filters',
  children,
  className,
}: FilterPanelProps) {
  const [filters, setFilters] = React.useState<Record<string, any>>({})
  
  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({})
    onReset()
  }

  // Provide filter context to child components
  const contextValue = React.useMemo(() => ({
    filters,
    setFilters,
    updateFilter: (key: string, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    removeFilter: (key: string) => {
      setFilters(prev => {
        const { [key]: removed, ...rest } = prev
        return rest
      })
    }
  }), [filters])

  if (!isOpen) return null

  return (
    <FilterContext.Provider value={contextValue}>
      <div className={cn('bg-white border border-gray-200 rounded-lg shadow-lg', className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter content */}
        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
          >
            Reset
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </FilterContext.Provider>
  )
}

// Filter context for communication between parent and child components
const FilterContext = React.createContext<{
  filters: Record<string, any>
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>
  updateFilter: (key: string, value: any) => void
  removeFilter: (key: string) => void
} | null>(null)

export function useFilterContext() {
  const context = React.useContext(FilterContext)
  if (!context) {
    throw new Error('useFilterContext must be used within a FilterPanel')
  }
  return context
}

// Filter group component
export function FilterGroup({ title, children, className }: FilterGroupProps) {
  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

// Filter field component
export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

// Pre-built filter components
export function DateRangeFilter({
  startKey = 'startDate',
  endKey = 'endDate',
}: {
  startKey?: string
  endKey?: string
}) {
  const { filters, updateFilter } = useFilterContext()

  return (
    <FilterGroup title="Date Range">
      <FilterField label="From">
        <input
          type="date"
          value={filters[startKey] || ''}
          onChange={(e) => updateFilter(startKey, e.target.value)}
          className="form-input"
        />
      </FilterField>
      <FilterField label="To">
        <input
          type="date"
          value={filters[endKey] || ''}
          onChange={(e) => updateFilter(endKey, e.target.value)}
          className="form-input"
        />
      </FilterField>
    </FilterGroup>
  )
}

export function StatusFilter({
  options,
  filterKey = 'status',
  title = 'Status',
}: {
  options: Array<{ label: string; value: string }>
  filterKey?: string
  title?: string
}) {
  const { filters, updateFilter } = useFilterContext()

  return (
    <FilterGroup title={title}>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center">
            <input
              type="checkbox"
              checked={filters[filterKey]?.includes(option.value) || false}
              onChange={(e) => {
                const currentValues = filters[filterKey] || []
                const newValues = e.target.checked
                  ? [...currentValues, option.value]
                  : currentValues.filter((v: string) => v !== option.value)
                updateFilter(filterKey, newValues)
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    </FilterGroup>
  )
}

// Hook for filter state management
export function useFilters<T extends Record<string, any>>(initialFilters: T = {} as T) {
  const [filters, setFilters] = React.useState<T>(initialFilters)
  const [isOpen, setIsOpen] = React.useState(false)

  const applyFilters = React.useCallback((newFilters: T) => {
    setFilters(newFilters)
  }, [])

  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const updateFilter = React.useCallback((key: keyof T, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const removeFilter = React.useCallback((key: keyof T) => {
    setFilters(prev => {
      const { [key]: removed, ...rest } = prev
      return rest as T
    })
  }, [])

  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some(value => 
      value !== null && 
      value !== undefined && 
      value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    )
  }, [filters])

  return {
    filters,
    setFilters,
    applyFilters,
    resetFilters,
    updateFilter,
    removeFilter,
    hasActiveFilters,
    isOpen,
    openFilters: () => setIsOpen(true),
    closeFilters: () => setIsOpen(false),
    toggleFilters: () => setIsOpen(prev => !prev),
  }
}