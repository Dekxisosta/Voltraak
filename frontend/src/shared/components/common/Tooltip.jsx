/**
 * Tooltip component for displaying helpful information on hover
 */

import React from 'react'
import { cn } from '@/utils'



const positionStyles = {
  top: {
    tooltip: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
  },
  bottom: {
    tooltip: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
  },
  left: {
    tooltip: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
  },
  right: {
    tooltip: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  },
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false,
  className,
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [timeoutId, setTimeoutId] = React.useState(null)
  const tooltipRef = React.useRef(null)

  const showTooltip = () => {
    if (disabled) return
    
    const id = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  const styles = positionStyles[position]

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap animate-fade-in',
            styles.tooltip
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              styles.arrow
            )}
          />
        </div>
      )}
    </div>
  )
}

// Hook for programmatic tooltip control
export function useTooltip() {
  const [isVisible, setIsVisible] = React.useState(false)
  
  const show = React.useCallback(() => setIsVisible(true), [])
  const hide = React.useCallback(() => setIsVisible(false), [])
  const toggle = React.useCallback(() => setIsVisible(prev => !prev), [])
  
  return {
    isVisible,
    show,
    hide,
    toggle,
  }
}