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
        // Status colors - semantic color system
        status: {
          ok: "#22c55e",
          warning: "#f59e0b", 
          critical: "#ef4444",
          neutral: "#94a3b8"
        },
        // Layout colors
        sidebar: {
          bg: "#1e293b",
          text: "#f1f5f9",
          hover: "#334155"
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
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
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
        'pulse-soft': 'pulseSoft 2s infinite'
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