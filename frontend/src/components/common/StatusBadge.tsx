/**
 * Status badge component for displaying semantic status information
 * Always includes text and icon - never color-only for accessibility
 */

import React from 'react'
import { CheckCircle, AlertTriangle, AlertCircle, Minus } from 'lucide-react'
import { cn } from '@/utils'
import type { StatusVariant } from '@/types'

interface StatusBadgeProps {
  variant: StatusVariant
  label: string
  icon?: React.ComponentType<{ className?: string }>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const variantStyles = {
  ok: {
    className: 'status-badge-ok',
    defaultIcon: CheckCircle,
  },
  warning: {
    className: 'status-badge-warning',
    defaultIcon: AlertTriangle,
  },
  critical: {
    className: 'status-badge-critical',
    defaultIcon: AlertCircle,
  },
  neutral: {
    className: 'status-badge-neutral',
    defaultIcon: Minus,
  },
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function StatusBadge({
  variant,
  label,
  icon: CustomIcon,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const variantConfig = variantStyles[variant]
  const Icon = CustomIcon || variantConfig.defaultIcon

  return (
    <span
      className={cn(
        'status-badge',
        variantConfig.className,
        sizeStyles[size],
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </span>
  )
}

// Convenience components for common status types
export function StockStatusBadge({
  currentStock,
  minimumStock,
  reorderPoint,
  ...props
}: {
  currentStock: number
  minimumStock: number
  reorderPoint: number
} & Omit<StatusBadgeProps, 'variant' | 'label'>) {
  const variant: StatusVariant = (() => {
    if (currentStock <= 0) return 'critical'
    if (currentStock <= minimumStock) return 'critical'
    if (currentStock <= reorderPoint) return 'warning'
    return 'ok'
  })()

  const label = (() => {
    if (currentStock <= 0) return 'Out of Stock'
    if (currentStock <= minimumStock) return 'Critical Low'
    if (currentStock <= reorderPoint) return 'Low Stock'
    return 'In Stock'
  })()

  return <StatusBadge variant={variant} label={label} {...props} />
}

export function BatchStatusBadge({
  expiryDate,
  isExpired,
  ...props
}: {
  expiryDate?: string
  isExpired?: boolean
} & Omit<StatusBadgeProps, 'variant' | 'label'>) {
  if (isExpired) {
    return <StatusBadge variant="critical" label="Expired" {...props} />
  }

  if (expiryDate) {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilExpiry < 0) {
      return <StatusBadge variant="critical" label="Expired" {...props} />
    } else if (daysUntilExpiry <= 60) {
      return <StatusBadge variant="warning" label={`${daysUntilExpiry} days`} {...props} />
    }
  }

  return <StatusBadge variant="ok" label="Safe" {...props} />
}

export function UserStatusBadge({
  isActive,
  ...props
}: {
  isActive: boolean
} & Omit<StatusBadgeProps, 'variant' | 'label'>) {
  return (
    <StatusBadge
      variant={isActive ? 'ok' : 'neutral'}
      label={isActive ? 'Active' : 'Inactive'}
      {...props}
    />
  )
}