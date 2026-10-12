/**
 * Reusable card component with consistent styling
 */

import { cn } from '@/utils'

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const shadowStyles = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

export default function Card({
  children,
  className,
  padding = 'none',
  shadow = 'sm',
}) {
  return (
    <div
      className={cn(
        'card',
        paddingStyles[padding],
        shadowStyles[shadow],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, action }) {
  return (
    <div className={cn('card-header', className)}>
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

export function CardBody({ children, className }) {
  return (
    <div className={cn('card-body', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }) {
  return (
    <div className={cn('card-footer', className)}>
      {children}
    </div>
  )
}

// Compound component syntax: <Card.Header>, <Card.Body>, <Card.Footer>
// (pages throughout the app use this form rather than the named exports)
Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

// Convenience card components
export function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color = 'gray',
}) {
  // Only 'good'/'warn'/'bad' carry status color. Everything else (including
  // the old 'blue' default) renders as a neutral icon tile - most stats
  // shown here are plain counts, not a status that needs to compete for
  // attention.
  const colorStyles = {
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    good: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    warn: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    bad: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60',
    // Legacy aliases so existing callers passing blue/green/yellow/red keep working
    blue: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    green: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    yellow: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60',
  }

  const changeStyles = {
    increase: 'text-emerald-600 dark:text-emerald-400',
    decrease: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center">
          {Icon && (
            <div className={cn('p-2 rounded-md border flex-shrink-0', colorStyles[color])}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className={cn('flex-1 min-w-0', Icon && 'ml-4')}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
            {change && changeType && (
              <p className={cn('text-xs mt-1 truncate', changeStyles[changeType])}>
                {change}
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export function EmptyCard({
  title,
  message,
  icon: Icon,
  action,
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-center py-12">
          {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />}
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      </CardBody>
    </Card>
  )
}