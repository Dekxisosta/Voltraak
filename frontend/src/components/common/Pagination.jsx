/**
 * Reusable pagination component
 */

import React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showInfo?: boolean
  className?: string
}

interface PaginationInfoProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showInfo = true,
  className,
}: PaginationProps) {
  const getVisiblePages = () => {
    const visiblePages: (number | 'ellipsis')[] = []
    const delta = 2 // Number of pages to show on each side of current page

    // Always show first page
    if (totalPages > 0) {
      visiblePages.push(1)
    }

    // Calculate start and end of the visible range
    const start = Math.max(2, currentPage - delta)
    const end = Math.min(totalPages - 1, currentPage + delta)

    // Add ellipsis after first page if needed
    if (start > 2) {
      visiblePages.push('ellipsis')
    }

    // Add pages in the visible range
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        visiblePages.push(i)
      }
    }

    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      visiblePages.push('ellipsis')
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      visiblePages.push(totalPages)
    }

    return visiblePages
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {showInfo && (
        <PaginationInfo currentPage={currentPage} totalPages={totalPages} />
      )}

      <nav className="flex items-center space-x-1">
        {/* First page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn(
              'px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === 1 && 'cursor-not-allowed'
            )}
          >
            First
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
            currentPage === 1 && 'cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {visiblePages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-sm text-gray-500"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              )}
            >
              {page}
            </button>
          )
        })}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
            currentPage === totalPages && 'cursor-not-allowed'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={cn(
              'px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === totalPages && 'cursor-not-allowed'
            )}
          >
            Last
          </button>
        )}
      </nav>
    </div>
  )
}

export function PaginationInfo({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: PaginationInfoProps) {
  if (totalItems && itemsPerPage) {
    const start = (currentPage - 1) * itemsPerPage + 1
    const end = Math.min(currentPage * itemsPerPage, totalItems)

    return (
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{start}</span> to{' '}
        <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-700">
      Page <span className="font-medium">{currentPage}</span> of{' '}
      <span className="font-medium">{totalPages}</span>
    </div>
  )
}

// Hook for pagination state management
export function usePagination(initialPage: number = 1, initialPerPage: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = React.useState(initialPerPage)

  const goToPage = React.useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const nextPage = React.useCallback(() => {
    setCurrentPage(prev => prev + 1)
  }, [])

  const prevPage = React.useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }, [])

  const resetPage = React.useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  }
}