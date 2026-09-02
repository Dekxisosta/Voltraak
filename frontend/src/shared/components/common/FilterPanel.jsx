/**
 * Reusable filter panel component for data filtering
 */

import React from 'react'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '@/utils'
import Button from './Button'

export default function FilterPanel({
  isOpen,
  onClose,
  onApply,
  onReset,
  title = 'Filters',
  children,
  className,
}) {
  const [filters, setFilters] = React.useState({})
  
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
    updateFilter: (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    removeFilter: (key) => {
      setFilters(prev => {
        const { [key]: _removed, ...rest } = prev
        return rest
      })
    }
  }), [filters])

  if (!isOpen) return null

  return (
    <FilterContext.Provider value={contextValue}>
      <div
        className={cn('rounded-xl border border-[var(--color-glass-border)] shadow-[var(--shadow-glass)]', className)}
        style={{
          background: 'var(--color-glass-card)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-glass-border)]">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter content */}
        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--color-glass-border)] bg-transparent">
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
const FilterContext = React.createContext(null)

export function useFilterContext() {
  const context = React.useContext(FilterContext)
  if (!context) {
    throw new Error('useFilterContext must be used within a FilterPanel')
  }
  return context
}

// Filter group component
export function FilterGroup({ title, children, className }) {
  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

// Filter field component
export function FilterField({ label, children, className }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
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
}){
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
}){
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
                  : currentValues.filter((v) => v !== option.value)
                updateFilter(filterKey, newValues)
              }}
              className="h-4 w-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)] border-[var(--color-input-border)] rounded"
            />
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">{option.label}</span>
          </label>
        ))}
      </div>
    </FilterGroup>
  )
}

// Hook for filter state management
export function useFilters(initialFilters = {}) {
  const [filters, setFilters] = React.useState(initialFilters)
  const [isOpen, setIsOpen] = React.useState(false)

  const applyFilters = React.useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const updateFilter = React.useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const removeFilter = React.useCallback((key) => {
    setFilters(prev => {
      const { [key]: _removed, ...rest } = prev
      return rest
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