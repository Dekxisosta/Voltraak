/**
 * AuthContext tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/hooks/useNotifications'
import * as authApi from '@/api/auth'

// Mock the auth API
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refreshToken: vi.fn(),
    getStoredToken: vi.fn(),
    getStoredUser: vi.fn(),
    clearAuth: vi.fn(),
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Test component to access auth context
function TestComponent() {
  const {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    hasRole,
    hasPermission,
    canAccessRoute,
  } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user-name">{user?.name || 'no-user'}</div>
      <div data-testid="user-role">{user?.role || 'no-role'}</div>
      
      <button 
        data-testid="login-btn" 
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>
      
      <button 
        data-testid="logout-btn" 
        onClick={() => logout()}
      >
        Logout
      </button>
      
      <div data-testid="has-manager-role">
        {hasRole('manager') ? 'has-manager' : 'no-manager'}
      </div>
      
      <div data-testid="has-inventory-permission">
        {hasPermission('inventory.view') ? 'has-permission' : 'no-permission'}
      </div>
      
      <div data-testid="can-access-admin">
        {canAccessRoute(['manager']) ? 'can-access' : 'cannot-access'}
      </div>
    </div>
  )
}

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          {component}
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  )
}

describe('AuthContext', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'manager',
    role_display: 'Manager',
    permissions: ['inventory.view', 'inventory.edit', 'users.manage'],
    is_active: true,
    display_name: 'John Doe',
    initials: 'JD',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockAuthResponse = {
    user: mockUser,
    token: 'mock-jwt-token',
    api_token: 'mock-api-token',
    expires_in: 3600,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('initializes with no authenticated user', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue(null)
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(null)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user')
  })

  it('initializes with stored authenticated user', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
    expect(screen.getByTestId('user-role')).toHaveTextContent('manager')
  })

  it('handles login successfully', async () => {
    vi.mocked(authApi.authApi.login).mockResolvedValue(mockAuthResponse)
    
    const user = userEvent.setup()
    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await act(async () => {
      await user.click(screen.getByTestId('login-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
    expect(vi.mocked(authApi.authApi.login)).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('handles login failure', async () => {
    vi.mocked(authApi.authApi.login).mockRejectedValue(new Error('Invalid credentials'))
    
    const user = userEvent.setup()
    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await expect(async () => {
      await act(async () => {
        await user.click(screen.getByTestId('login-btn'))
      })
    }).rejects.toThrow('Invalid credentials')

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
  })

  it('handles logout', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)
    vi.mocked(authApi.authApi.logout).mockResolvedValue()

    const user = userEvent.setup()
    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    await act(async () => {
      await user.click(screen.getByTestId('logout-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    })

    expect(vi.mocked(authApi.authApi.logout)).toHaveBeenCalled()
  })

  it('checks user roles correctly', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('has-manager-role')).toHaveTextContent('has-manager')
    })
  })

  it('checks user permissions correctly', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('has-inventory-permission')).toHaveTextContent('has-permission')
    })
  })

  it('checks route access correctly', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('can-access-admin')).toHaveTextContent('can-access')
    })
  })

  it('handles token refresh automatically', async () => {
    vi.useFakeTimers()
    
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)
    vi.mocked(authApi.authApi.refreshToken).mockResolvedValue({
      token: 'new-jwt-token',
      api_token: 'new-api-token',
      expires_in: 3600,
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Fast forward to token refresh time (45 minutes)
    act(() => {
      vi.advanceTimersByTime(45 * 60 * 1000)
    })

    await waitFor(() => {
      expect(vi.mocked(authApi.authApi.refreshToken)).toHaveBeenCalled()
    })

    vi.useRealTimers()
  })

  it('handles session expiry', async () => {
    vi.useFakeTimers()
    
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)
    vi.mocked(authApi.authApi.refreshToken).mockRejectedValue(new Error('Token expired'))

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Fast forward to token refresh time
    act(() => {
      vi.advanceTimersByTime(45 * 60 * 1000)
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    })

    vi.useRealTimers()
  })

  it('shows session expiry warning', async () => {
    vi.useFakeTimers()
    
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(mockUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Fast forward to warning time (55 minutes)
    act(() => {
      vi.advanceTimersByTime(55 * 60 * 1000)
    })

    // Should show session expiry warning
    // Note: This would require additional DOM checking for notification components

    vi.useRealTimers()
  })

  it('handles invalid stored token', async () => {
    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('invalid-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(mockUser)
    vi.mocked(authApi.authApi.me).mockRejectedValue(new Error('Unauthorized'))

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(vi.mocked(authApi.authApi.clearAuth)).toHaveBeenCalled()
  })

  it('handles different user roles', async () => {
    const warehouseUser = {
      ...mockUser,
      role: 'warehouse',
      permissions: ['inventory.view'],
    }

    vi.mocked(authApi.authApi.getStoredToken).mockReturnValue('stored-token')
    vi.mocked(authApi.authApi.getStoredUser).mockReturnValue(warehouseUser)
    vi.mocked(authApi.authApi.me).mockResolvedValue(warehouseUser)

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('user-role')).toHaveTextContent('warehouse')
      expect(screen.getByTestId('has-manager-role')).toHaveTextContent('no-manager')
      expect(screen.getByTestId('can-access-admin')).toHaveTextContent('cannot-access')
    })
  })
})