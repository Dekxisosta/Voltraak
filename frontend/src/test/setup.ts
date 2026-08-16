/**
 * Test setup configuration for Vitest
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

// Mock window.location
delete (window as any).location
window.location = {
  ...window.location,
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
}

// Setup console.error to not throw in tests but still log warnings
const originalError = console.error
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
    return
  }
  originalError.call(console, ...args)
}