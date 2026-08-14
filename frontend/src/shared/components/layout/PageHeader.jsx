/**
 * Reusable page header component with breadcrumbs and actions
 */

import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils'





export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </li>
            
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                {item.href && index < breadcrumbs.length - 1 ? (
                  <Link
                    to={item.href}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title and actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Convenience component for common page layouts
export function PageContainer({
  children,
  className,
}){
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6', className)}>
      {children}
    </div>
  )
}

// Responsive grid layout for pages
export function PageGrid({
  children,
  cols = 1,
  gap = 6,
  className,
}) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  const gapClass = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  }

  return (
    <div className={cn('grid', colsClass[cols], gapClass[gap], className)}>
      {children}
    </div>
  )
}