/**
 * Reusable input component with consistent styling and validation
 */

import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils'

export default function Input({
  type = 'text',
  label,
  error,
  helpText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  containerClassName,
  className,
  ...props
}) {
  const [showPassword, setShowPassword] = React.useState(false)
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={props.id} className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LeftIcon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        
        <input
          type={inputType}
          className={cn(
            'form-input',
            LeftIcon && 'pl-10',
            (RightIcon || type === 'password') && 'pr-10',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
        
        {RightIcon && type !== 'password' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <RightIcon className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="form-error">{error}</p>
      )}
      
      {helpText && !error && (
        <p className="form-help">{helpText}</p>
      )}
    </div>
  )
}

// Specialized input components
export function SearchInput({
  placeholder = 'Search...',
  ...props
}) {
  return (
    <Input
      type="search"
      placeholder={placeholder}
      leftIcon={() => (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      {...props}
    />
  )
}

export function NumberInput({
  min,
  max,
  step = 1,
  ...props
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      {...props}
    />
  )
}

export function EmailInput(props) {
  return <Input type="email" {...props} />
}

export function PasswordInput(props) {
  return <Input type="password" {...props} />
}