/**
 * Reusable card component with consistent styling
 */

import React from 'react'
import { cn } from '@/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

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
}: CardProps) {
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

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={cn('card-header', className)}>
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('card-body', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('card-footer', className)}>
      {children}
    </div>
  )
}

// Convenience card components
export function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color = 'blue',
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
}) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  const changeStyles = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-500',
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center">
          {Icon && (
            <div className={cn('p-2 rounded-md border', colorStyles[color])}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className={cn('flex-1', Icon && 'ml-4')}>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && changeType && (
              <p className={cn('text-xs mt-1', changeStyles[changeType])}>
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
}: {
  title: string
  message: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-center py-12">
          {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400" />}
          <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      </CardBody>
    </Card>
  )
}