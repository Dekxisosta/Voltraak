/**
 * StatusBadge component tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge, { StockStatusBadge, BatchStatusBadge, UserStatusBadge } from '@/components/common/StatusBadge'

describe('StatusBadge', () => {
  it('renders basic status badge', () => {
    render(<StatusBadge variant="ok" label="In Stock" />)
    
    const badge = screen.getByText('In Stock')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('status-badge-ok')
  })

  it('renders with warning variant', () => {
    render(<StatusBadge variant="warning" label="Low Stock" />)
    
    const badge = screen.getByText('Low Stock')
    expect(badge).toHaveClass('status-badge-warning')
  })

  it('renders with critical variant', () => {
    render(<StatusBadge variant="critical" label="Out of Stock" />)
    
    const badge = screen.getByText('Out of Stock')
    expect(badge).toHaveClass('status-badge-critical')
  })

  it('renders with neutral variant', () => {
    render(<StatusBadge variant="neutral" label="Unknown" />)
    
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('status-badge-neutral')
  })

  it('renders with icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">📦</span>
    
    render(<StatusBadge variant="ok" label="In Stock" icon={TestIcon} />)
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StatusBadge variant="ok" label="Test" className="custom-class" />)
    
    const badge = screen.getByText('Test')
    expect(badge).toHaveClass('custom-class')
  })

  it('renders in small size', () => {
    render(<StatusBadge variant="ok" label="Small Badge" size="sm" />)
    
    const badge = screen.getByText('Small Badge')
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
  })

  it('renders in large size', () => {
    render(<StatusBadge variant="ok" label="Large Badge" size="lg" />)
    
    const badge = screen.getByText('Large Badge')
    expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm')
  })

  it('is accessible', () => {
    render(<StatusBadge variant="critical" label="Critical Status" />)
    
    const badge = screen.getByText('Critical Status')
    expect(badge).toHaveClass('status-badge')
  })
})

describe('StockStatusBadge', () => {
  it('renders in-stock status', () => {
    render(<StockStatusBadge currentStock={50} minimumStock={10} reorderPoint={20} />)
    
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('renders low-stock status', () => {
    render(<StockStatusBadge currentStock={5} minimumStock={10} reorderPoint={20} />)
    
    const badge = screen.getByText('Critical Low')
    expect(badge).toHaveClass('status-badge-critical')
  })

  it('renders out-of-stock status', () => {
    render(<StockStatusBadge currentStock={0} minimumStock={10} reorderPoint={20} />)
    
    const badge = screen.getByText('Out of Stock')
    expect(badge).toHaveClass('status-badge-critical')
  })
})

describe('BatchStatusBadge', () => {
  it('renders safe batch status', () => {
    render(<BatchStatusBadge expiryDate="2025-12-31" />)
    
    expect(screen.getByText('Safe')).toBeInTheDocument()
  })

  it('renders warning batch status', () => {
    const warningDate = new Date()
    warningDate.setDate(warningDate.getDate() + 30) // 30 days from now
    
    render(<BatchStatusBadge expiryDate={warningDate.toISOString()} />)
    
    expect(screen.getByText(/30 days/)).toBeInTheDocument()
  })

  it('renders expired batch status', () => {
    render(<BatchStatusBadge isExpired={true} />)
    
    const badge = screen.getByText('Expired')
    expect(badge).toHaveClass('status-badge-critical')
  })
})

describe('UserStatusBadge', () => {
  it('renders active user status', () => {
    render(<UserStatusBadge isActive={true} />)
    
    const badge = screen.getByText('Active')
    expect(badge).toHaveClass('status-badge-ok')
  })

  it('renders inactive user status', () => {
    render(<UserStatusBadge isActive={false} />)
    
    const badge = screen.getByText('Inactive')
    expect(badge).toHaveClass('status-badge-neutral')
  })
})