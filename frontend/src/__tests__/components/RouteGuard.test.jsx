/**
 * RouteGuard component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { RouteGuard, RoleGuard, PermissionGuard } from '@/shared/components/common/RouteGuard'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import { NotificationProvider } from '@/shared/hooks/useNotifications'
import { authApi } from '@/shared/api/auth'

// Mock the auth API
vi.mock('@/shared/api/auth', () => ({
  authApi: {
    getStoredToken: vi.fn(),
    getStoredUser: vi.fn(),
    me: vi.fn(),
    clearAuth: vi.fn(),
  }
}))

function renderWithAuth(
  component,
  user = null,
  token = null
) {
  vi.mocked(authApi.getStoredToken).mockReturnValue(token)
  vi.mocked(authApi.getStoredUser).mockReturnValue(user)
  
  if (user && token) {
    vi.mocked(authApi.me).mockResolvedValue(user)
  }

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

describe('RouteGuard', () => {
  const mockManagerUser = {
    id: 1,
    name: 'Manager User',
    email: 'manager@example.com',
    role: 'manager',
    permissions: ['users.manage', 'inventory.edit', 'reports.view'],
    is_active: true,
  }

  const mockWarehouseUser = {
    id: 2,
    name: 'Warehouse User',
    email: 'warehouse@example.com',
    role: 'warehouse',
    permissions: ['inventory.view'],
    is_active: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user is authenticated and authorized', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    renderWithAuth(
      <RouteGuard requiredRoles={['manager']}>
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('shows loading spinner while checking authentication', () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    render(
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <RouteGuard requiredRoles={['manager']}>
              <ProtectedComponent />
            </RouteGuard>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Checking access...')).toBeInTheDocument()
  })

  it('shows unauthorized page when user is not authenticated', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    renderWithAuth(
      <RouteGuard requiredRoles={['manager']}>
        <ProtectedComponent />
      </RouteGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('401')).toBeInTheDocument()
      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    })
  })

  it('shows forbidden page when user lacks required role', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    renderWithAuth(
      <RouteGuard requiredRoles={['manager']}>
        <ProtectedComponent />
      </RouteGuard>,
      mockWarehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument()
      expect(screen.getByText('Access Forbidden')).toBeInTheDocument()
      expect(screen.getByText(/Required roles: manager/)).toBeInTheDocument()
      expect(screen.getByText(/Your role: warehouse/)).toBeInTheDocument()
    })
  })

  it('allows access when user has any of the required roles', async () => {
    const ProtectedComponent = () => <div>Manager or Inventory Content</div>

    renderWithAuth(
      <RouteGuard requiredRoles={['manager', 'inventory_staff']}>
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Manager or Inventory Content')).toBeInTheDocument()
    })
  })

  it('requires all roles when requireAllRoles is true', async () => {
    const ProtectedComponent = () => <div>All Roles Required</div>

    renderWithAuth(
      <RouteGuard 
        requiredRoles={['manager', 'admin']} 
        requireAllRoles={true}
      >
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument()
    })
  })

  it('checks permissions when provided', async () => {
    const ProtectedComponent = () => <div>Permission Content</div>

    renderWithAuth(
      <RouteGuard requiredPermissions={['users.manage']}>
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Permission Content')).toBeInTheDocument()
    })
  })

  it('denies access when user lacks required permission', async () => {
    const ProtectedComponent = () => <div>Admin Content</div>

    renderWithAuth(
      <RouteGuard requiredPermissions={['admin.access']}>
        <ProtectedComponent />
      </RouteGuard>,
      mockWarehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument()
      expect(screen.getByText(/Required permissions: admin.access/)).toBeInTheDocument()
    })
  })

  it('requires all permissions when requireAllPermissions is true', async () => {
    const ProtectedComponent = () => <div>All Permissions Required</div>

    renderWithAuth(
      <RouteGuard 
        requiredPermissions={['users.manage', 'admin.access']}
        requireAllPermissions={true}
      >
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument()
    })
  })

  it('uses custom check function', async () => {
    const ProtectedComponent = () => <div>Custom Check Content</div>
    const customCheck = (user) => user?.name === 'Manager User'

    renderWithAuth(
      <RouteGuard customCheck={customCheck}>
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Custom Check Content')).toBeInTheDocument()
    })
  })

  it('denies access when custom check fails', async () => {
    const ProtectedComponent = () => <div>Custom Check Content</div>
    const customCheck = (user) => user?.name === 'Admin User'

    renderWithAuth(
      <RouteGuard customCheck={customCheck}>
        <ProtectedComponent />
      </RouteGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument()
    })
  })

  it('renders fallback component when provided', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>
    const FallbackComponent = () => <div>Custom Fallback</div>

    renderWithAuth(
      <RouteGuard 
        requiredRoles={['admin']}
        fallbackComponent={FallbackComponent}
      >
        <ProtectedComponent />
      </RouteGuard>,
      mockWarehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
    })
  })

  it('shows custom error message', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    renderWithAuth(
      <RouteGuard 
        requiredRoles={['admin']}
        customErrorMessage="You need admin access to view this page."
      >
        <ProtectedComponent />
      </RouteGuard>,
      mockWarehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('You need admin access to view this page.')).toBeInTheDocument()
    })
  })

  it('can hide back button', async () => {
    const ProtectedComponent = () => <div>Protected Content</div>

    renderWithAuth(
      <RouteGuard 
        requiredRoles={['admin']}
        showBackButton={false}
      >
        <ProtectedComponent />
      </RouteGuard>,
      mockWarehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.queryByText('Go Back')).not.toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })
  })
})

describe('RoleGuard', () => {
  const mockManagerUser = {
    id: 1,
    name: 'Manager User',
    role: 'manager',
    permissions: [],
    is_active: true,
  }

  it('renders children when user has required role', async () => {
    renderWithAuth(
      <RoleGuard roles="manager">
        <div>Manager Content</div>
      </RoleGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Manager Content')).toBeInTheDocument()
    })
  })

  it('renders children when user has one of multiple roles', async () => {
    renderWithAuth(
      <RoleGuard roles={['manager', 'admin']}>
        <div>Admin or Manager Content</div>
      </RoleGuard>,
      mockManagerUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Admin or Manager Content')).toBeInTheDocument()
    })
  })

  it('renders fallback when user lacks role', async () => {
    const warehouseUser = { ...mockManagerUser, role: 'warehouse' }

    renderWithAuth(
      <RoleGuard 
        roles="manager" 
        fallback={<div>Access Denied</div>}
      >
        <div>Manager Content</div>
      </RoleGuard>,
      warehouseUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })
  })
})

describe('PermissionGuard', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    role: 'user',
    permissions: ['inventory.view', 'reports.view'],
    is_active: true,
  }

  it('renders children when user has required permission', async () => {
    renderWithAuth(
      <PermissionGuard permissions="inventory.view">
        <div>Inventory Content</div>
      </PermissionGuard>,
      mockUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Inventory Content')).toBeInTheDocument()
    })
  })

  it('renders children when user has one of multiple permissions', async () => {
    renderWithAuth(
      <PermissionGuard permissions={['inventory.edit', 'inventory.view']}>
        <div>Inventory Content</div>
      </PermissionGuard>,
      mockUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Inventory Content')).toBeInTheDocument()
    })
  })

  it('renders fallback when user lacks permission', async () => {
    renderWithAuth(
      <PermissionGuard 
        permissions="admin.access"
        fallback={<div>No Access</div>}
      >
        <div>Admin Content</div>
      </PermissionGuard>,
      mockUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('No Access')).toBeInTheDocument()
    })
  })

  it('requires all permissions when requireAll is true', async () => {
    renderWithAuth(
      <PermissionGuard 
        permissions={['inventory.view', 'admin.access']}
        requireAll={true}
        fallback={<div>Missing Permissions</div>}
      >
        <div>All Permissions Content</div>
      </PermissionGuard>,
      mockUser,
      'valid-token'
    )

    await waitFor(() => {
      expect(screen.getByText('Missing Permissions')).toBeInTheDocument()
    })
  })
})