/**
 * StatusBadge component tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/common'

describe('StatusBadge', () => {
  it('renders basic status badge', () => {
    render(<StatusBadge tone="ok" label="In Stock" />)
    
    const badge = screen.getByText('In Stock')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders with warning tone', () => {
    render(<StatusBadge tone="warning" label="Low Stock" />)
    
    const badge = screen.getByText('Low Stock')
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders with critical tone', () => {
    render(<StatusBadge tone="critical" label="Out of Stock" />)
    
    const badge = screen.getByText('Out of Stock')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('renders with neutral tone', () => {
    render(<StatusBadge tone="neutral" label="Unknown" />)
    
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('renders with icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">📦</span>
    
    render(<StatusBadge tone="ok" label="In Stock" icon={TestIcon} />)
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StatusBadge tone="ok" label="Test" className="custom-class" />)
    
    const badge = screen.getByText('Test')
    expect(badge).toHaveClass('custom-class')
  })

  it('renders in small size', () => {
    render(<StatusBadge tone="ok" label="Small Badge" size="sm" />)
    
    const badge = screen.getByText('Small Badge')
    expect(badge).toHaveClass('px-2', 'py-1', 'text-xs')
  })

  it('renders in large size', () => {
    render(<StatusBadge tone="ok" label="Large Badge" size="lg" />)
    
    const badge = screen.getByText('Large Badge')
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base')
  })

  it('is accessible', () => {
    render(<StatusBadge tone="critical" label="Critical Status" />)
    
    const badge = screen.getByText('Critical Status')
    expect(badge).toHaveAttribute('role', 'status')
  })
})

describe('StockStatusBadge', () => {
  it('renders in-stock status', () => {
    render(<StatusBadge.Stock status="in_stock" quantity={50} />)
    
    expect(screen.getByText('In Stock')).toBeInTheDocument()
    expect(screen.getByText('50 available')).toBeInTheDocument()
  })

  it('renders low-stock status', () => {
    render(<StatusBadge.Stock status="low_stock" quantity={5} />)
    
    const badge = screen.getByText('Low Stock')
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders out-of-stock status', () => {
    render(<StatusBadge.Stock status="out_of_stock" quantity={0} />)
    
    const badge = screen.getByText('Out of Stock')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('shows reorder point warning', () => {
    render(
      <StatusBadge.Stock 
        status="low_stock" 
        quantity={8} 
        reorderPoint={10}
        showReorderPoint 
      />
    )
    
    expect(screen.getByText('Below reorder point (10)')).toBeInTheDocument()
  })
})

describe('BatchStatusBadge', () => {
  it('renders safe batch status', () => {
    render(<StatusBadge.Batch status="safe" expiryDate="2025-12-31" />)
    
    expect(screen.getByText('Safe')).toBeInTheDocument()
    expect(screen.getByText(/Expires: Dec 31, 2025/)).toBeInTheDocument()
  })

  it('renders warning batch status', () => {
    const warningDate = new Date()
    warningDate.setDate(warningDate.getDate() + 30) // 30 days from now
    
    render(<StatusBadge.Batch status="warning" expiryDate={warningDate.toISOString()} />)
    
    const badge = screen.getByText('Expiring Soon')
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders expired batch status', () => {
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday
    
    render(<StatusBadge.Batch status="expired" expiryDate={expiredDate.toISOString()} />)
    
    const badge = screen.getByText('Expired')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('shows days until expiry', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15) // 15 days from now
    
    render(
      <StatusBadge.Batch 
        status="warning" 
        expiryDate={futureDate.toISOString()}
        showDaysUntilExpiry 
      />
    )
    
    expect(screen.getByText(/15 days until expiry/)).toBeInTheDocument()
  })
})

describe('UserStatusBadge', () => {
  it('renders active user status', () => {
    render(<StatusBadge.User isActive={true} />)
    
    const badge = screen.getByText('Active')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders inactive user status', () => {
    render(<StatusBadge.User isActive={false} />)
    
    const badge = screen.getByText('Inactive')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('shows last login when provided', () => {
    const lastLogin = new Date().toISOString()
    
    render(<StatusBadge.User isActive={true} lastLogin={lastLogin} showLastLogin />)
    
    expect(screen.getByText(/Last login:/)).toBeInTheDocument()
  })

  it('shows role when provided', () => {
    render(<StatusBadge.User isActive={true} role="manager" showRole />)
    
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })
})