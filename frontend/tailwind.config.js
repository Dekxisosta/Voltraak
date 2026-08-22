/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Status colors - semantic color system (the only place color should
        // carry meaning in the UI - stock/order/discrepancy health, etc.)
        status: {
          ok: "#10b981",
          warning: "#f59e0b",
          critical: "#ef4444",
          neutral: "#a1a1aa"
        },
        // Layout colors - neutral graphite, matches the theme's --color-*
        // sidebar variables
        sidebar: {
          bg: "#18181b",
          text: "#f4f4f5",
          hover: "#27272a"
        },
        // Extended grays for better contrast
        gray: {
          25: "#fcfcfd",
          50: "#f9fafb",
          75: "#f4f5f7",
          800: "#1f2937",
          850: "#1a202c",
          900: "#111827",
          950: "#030712"
        }
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        heading: [
          '"Space Grotesk"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '220': '55rem'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        // Toast enter/exit - slide from the right edge (toasts are docked
        // top-right), with a snappier ease-out on the way in and a quick
        // ease-in on the way out so it feels responsive rather than laggy.
        'toast-in': 'toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-out': 'toastOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        toastIn: {
          '0%': { transform: 'translateX(110%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' }
        },
        toastOut: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1', maxHeight: '200px', marginBottom: '0.5rem' },
          '60%': { transform: 'translateX(110%) scale(0.95)', opacity: '0', maxHeight: '200px', marginBottom: '0.5rem' },
          '100%': { transform: 'translateX(110%) scale(0.95)', opacity: '0', maxHeight: '0px', marginBottom: '0px' }
        }
      }
    },
  },
  plugins: [],
  // Safelist classes used in dynamic components
  safelist: [
    'bg-status-ok',
    'bg-status-warning', 
    'bg-status-critical',
    'bg-status-neutral',
    'text-status-ok',
    'text-status-warning',
    'text-status-critical', 
    'text-status-neutral',
    'border-status-ok',
    'border-status-warning',
    'border-status-critical',
    'border-status-neutral'
  ]
}