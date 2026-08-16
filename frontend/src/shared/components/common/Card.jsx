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
  color = 'blue',
}) {
  const colorStyles = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  }

  const changeStyles = {
    increase: 'text-green-600 dark:text-green-400',
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