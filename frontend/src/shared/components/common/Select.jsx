/**
 * Reusable select component with consistent styling
 */

import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils'





export default function Select({
  label,
  error,
  helpText,
  options,
  placeholder,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={props.id} className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          className={cn(
            'form-input appearance-none pr-10 cursor-pointer',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
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

// Convenience selects for common use cases
export function RoleSelect({
  includeAll = false,
  ...props
}) {
  const options = [
    ...(includeAll ? [{ label: 'All Roles', value: '' }] : []),
    { label: 'Warehouse Staff', value: 'warehouse' },
    { label: 'Inventory Staff', value: 'inventory_staff' },
    { label: 'Manager', value: 'manager' },
  ]

  return <Select options={options} {...props} />
}

export function StatusSelect({
  includeAll = false,
  ...props
}) {
  const options = [
    ...(includeAll ? [{ label: 'All Status', value: '' }] : []),
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ]

  return <Select options={options} {...props} />
}