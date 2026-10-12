/**
 * Advanced search bar component with filters and suggestions
 */

import React from 'react'
import { Search, X, Filter } from 'lucide-react'
import { cn, debounce } from '@/utils'

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  suggestions = [],
  showFilters = false,
  filters,
  className,
  debounceMs = 300,
}) {
  const [_isFocused, setIsFocused] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const searchRef = React.useRef(null)

  // Debounced search function
  const debouncedSearch = React.useMemo(
    () => onSearch ? debounce(onSearch, debounceMs) : undefined,
    [onSearch, debounceMs]
  )

  // Handle search input changes
  const handleChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (debouncedSearch) {
      debouncedSearch(newValue)
    }
    
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion)
    if (onSearch) {
      onSearch(suggestion)
    }
    setShowSuggestions(false)
  }

  // Handle clear search
  const handleClear = () => {
    onChange('')
    if (onSearch) {
      onSearch('')
    }
    setShowSuggestions(false)
  }

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setIsFocused(false)
    }
  }

  // Filter suggestions based on current value
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase())
  )

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)} ref={searchRef}>
      <div className="flex items-center space-x-2">
        {/* Search input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          
          <input
            type="search"
            value={value}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true)
              setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'form-input pl-10',
              value && 'pr-10'
            )}
          />
          
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Filters toggle */}
        {showFilters && (
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              'btn btn-secondary',
              filtersOpen && 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters panel */}
      {filtersOpen && filters && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-4">
          {filters}
        </div>
      )}
    </div>
  )
}

// Hook for search state management
export function useSearch(initialValue = '') {
  const [searchTerm, setSearchTerm] = React.useState(initialValue)
  const [debouncedTerm, setDebouncedTerm] = React.useState(initialValue)

  // Debounce the search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  return {
    searchTerm,
    debouncedTerm,
    setSearchTerm,
    clearSearch: () => setSearchTerm(''),
  }
}