/**
 * Design Tokens - Single source of truth for design values
 * These tokens should be used throughout the application for consistency
 */

export const colors = {
  // Status colors (primary semantic language)
  status: {
    ok: '#22c55e',       // Green - In-stock, Safe batches, Confirmed actions
    warning: '#f59e0b',  // Amber - Low stock, Warning batches (≤60 days), Pending states  
    critical: '#ef4444', // Red - Out of stock, Expired batches, Rejected items
    neutral: '#94a3b8',  // Slate - Default/unset states
  },
  
  // Layout colors
  sidebar: {
    bg: '#1e293b',       // Dark slate background
    text: '#f1f5f9',     // Light text
    hover: '#334155',    // Hover state
  },
  
  // Brand colors
  brand: {
    primary: '#2563eb',   // Blue primary
    secondary: '#64748b', // Slate secondary  
  },
  
  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b', 
  error: '#ef4444',
  info: '#3b82f6',
  
  // Gray scale
  gray: {
    25: '#fcfcfd',
    50: '#f9fafb', 
    75: '#f4f5f7',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    850: '#1a202c',
    900: '#111827',
    950: '#030712',
  }
} as const

export const spacing = {
  // Base spacing scale (4px base unit)
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px  
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px - Standard outer padding
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  
  // Semantic spacing
  containerPadding: '1.5rem', // 24px - Standard content padding
  sidebarWidth: '13.75rem',   // 220px - Sidebar width
} as const

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
} as const

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px  
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  full: '9999px',   // Fully rounded
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms', 
    slow: '300ms',
  },
  
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)', 
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }
} as const

export const zIndex = {
  dropdown: 50,
  sticky: 60,
  fixed: 70,
  modal: 80,
  popover: 90,
  tooltip: 100,
} as const

// Component-specific tokens
export const components = {
  // Status badges
  statusBadge: {
    padding: '0.25rem 0.625rem', // py-1 px-2.5
    fontSize: '0.75rem',         // text-xs
    fontWeight: '500',           // font-medium
    borderRadius: borderRadius.full,
  },
  
  // Buttons
  button: {
    padding: {
      sm: '0.5rem 0.75rem',    // py-2 px-3
      md: '0.625rem 1rem',     // py-2.5 px-4  
      lg: '0.75rem 1.5rem',    // py-3 px-6
    },
    fontSize: {
      sm: typography.fontSize.xs[0],
      md: typography.fontSize.sm[0],
      lg: typography.fontSize.base[0],
    },
    borderRadius: borderRadius.md,
  },
  
  // Cards
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[6], // 24px
    shadow: shadows.sm,
    borderColor: colors.gray[200],
  },
  
  // Navigation
  nav: {
    link: {
      padding: '0.5rem 0.75rem', // py-2 px-3
      fontSize: typography.fontSize.sm[0],
      fontWeight: typography.fontWeight.medium,
      borderRadius: borderRadius.md,
    }
  }
} as const

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Export utility function for consistent color usage
export const getStatusColor = (status: 'ok' | 'warning' | 'critical' | 'neutral') => {
  return colors.status[status]
}

// Export utility for consistent spacing
export const getSpacing = (key: keyof typeof spacing) => {
  return spacing[key]
}