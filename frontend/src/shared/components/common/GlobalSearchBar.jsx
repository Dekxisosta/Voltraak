/**
 * GlobalSearchBar
 *
 * The header's search input. Unlike the generic SearchBar (which only
 * echoes back string suggestions), this queries searchGlobal() for real
 * records the current user can access, and clicking a result navigates
 * straight to it — the target page then scrolls to and flashes that row
 * via the `?highlight=` param (see useHighlightParam / Table.jsx).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Package,
  BarChart3,
  ArrowUpDown,
  AlertCircle,
  Calendar,
  Truck,
  FileBarChart,
  ShoppingCart,
  Users,
  Loader2,
} from 'lucide-react'
import { cn, debounce } from '@/utils'
import { useAuth } from '@/shared/contexts/AuthContext'
import { searchGlobal } from '@/shared/services/globalSearch'

const ICONS = {
  Package,
  BarChart3,
  ArrowUpDown,
  AlertCircle,
  Calendar,
  Truck,
  FileBarChart,
  ShoppingCart,
  Users,
}

export default function GlobalSearchBar({ className, placeholder = 'Search products, batches...' }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const requestId = useRef(0)

  const runSearch = useMemo(
    () =>
      debounce(async (term) => {
        const trimmed = term.trim()
        if (!trimmed) {
          setResults([])
          setIsLoading(false)
          return
        }

        const thisRequest = ++requestId.current
        setIsLoading(true)
        try {
          const found = await searchGlobal(trimmed, user?.role)
          if (thisRequest === requestId.current) {
            setResults(found)
            setActiveIndex(-1)
          }
        } finally {
          if (thisRequest === requestId.current) setIsLoading(false)
        }
      }, 250),
    [user?.role]
  )

  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    runSearch(value)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const goToResult = (result) => {
    if (!result) return
    navigate(result.path)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      goToResult(results[activeIndex] ?? results[0])
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showDropdown = isOpen && query.trim().length > 0

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>

        <input
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn('form-input pl-10', query && 'pr-10')}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute z-20 w-full mt-1 rounded-md shadow-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'var(--color-border-primary)' }}
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-96 overflow-auto py-1">
              {results.map((result, index) => {
                const Icon = ICONS[result.icon] || Package
                const isActive = index === activeIndex
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => goToResult(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className="w-full flex items-start gap-3 text-left px-4 py-2.5 focus:outline-none"
                      style={{
                        backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                      }}
                    >
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {result.title}
                          </span>
                          <span
                            className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
                          >
                            {result.type}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
