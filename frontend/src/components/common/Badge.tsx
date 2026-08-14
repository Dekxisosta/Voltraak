/**
 * Generic badge component for labels, counts, and indicators
 */

import React from 'react'
import { cn } from '@/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  className?: string
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  primary: 'bg-blue-100 text-blue-800 border-blue-200',
  secondary: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
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
}: BadgeProps) {
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
}: Omit<BadgeProps, 'children'> & {
  count: number
  max?: number
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
}: Omit<BadgeProps, 'children'> & {
  count: number
  show?: boolean
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