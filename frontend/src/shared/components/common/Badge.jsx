/**
 * Generic badge component for labels, counts, and indicators
 */

import { cn } from '@/utils'



const variantStyles = {
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border',
        variantStyles[variant],
        sizeStyles[size],
        rounded ? 'rounded-full' : 'rounded-md',
        className
      )}
    >
      {children}
    </span>
  )
}

// Convenience badge components
export function CountBadge({
  count,
  max = 99,
  ...props
}) {
  const displayCount = count > max ? `${max}+` : count.toString()
  
  return (
    <Badge variant="primary" size="sm" rounded {...props}>
      {displayCount}
    </Badge>
  )
}

export function NotificationBadge({
  count,
  show = true,
  ...props
}) {
  if (!show || count <= 0) return null
  
  return (
    <Badge
      variant="danger"
      size="sm"
      rounded
      className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs"
      {...props}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  )
}