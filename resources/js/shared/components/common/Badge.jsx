/**
 * Generic badge component for labels, counts, and indicators
 */

import { cn } from '@/utils'



// "primary" / "secondary" / "info" are neutral - they label or categorize,
// they don't signal status. Only success/warning/danger carry color, since
// those are the states a user actually needs to notice at a glance.
const variantStyles = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  primary: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100',
  secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
  danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60',
  info: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
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