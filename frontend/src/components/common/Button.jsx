/**
 * Reusable button component with consistent styling
 */

import React from 'react'
import { cn } from '@/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  fullWidth?: boolean
}

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  warning: 'btn-warning',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const sizeStyles = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={cn(
        'btn',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <div className="loading-spinner" />
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </>
      )}
    </button>
  )
}

// Convenience button variants
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />
}