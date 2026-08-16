/**
 * Common components index file
 * Exports all reusable UI components
 */

// Core UI components
export { default as Button, PrimaryButton, SecondaryButton, DangerButton, GhostButton } from './Button'
export { default as Input, SearchInput, NumberInput, EmailInput, PasswordInput } from './Input'
export { default as Select, RoleSelect, StatusSelect } from './Select'
export { default as Badge, CountBadge, NotificationBadge } from './Badge'
export { default as StatusBadge, StockStatusBadge, BatchStatusBadge, UserStatusBadge } from './StatusBadge'

// Layout components
export { default as Card, CardHeader, CardBody, CardFooter, StatCard, EmptyCard } from './Card'
export { default as Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from './Modal'
export { default as ProfileModal } from './ProfileModal'
export { default as Table, useTableSort, ResponsiveTable, AdaptiveTable } from './Table'
export { default as Pagination, PaginationInfo, usePagination } from './Pagination'

// Utility components
export { default as LoadingSpinner } from './LoadingSpinner'
export { default as ErrorBoundary } from './ErrorBoundary'
export { default as Tooltip, useTooltip } from './Tooltip'

// Interactive components
export { default as SearchBar, useSearch } from './SearchBar'
export { default as GlobalSearchBar } from './GlobalSearchBar'
export { default as FilterPanel, FilterGroup, FilterField, DateRangeFilter, StatusFilter, useFilters, useFilterContext } from './FilterPanel'

// Route protection and authentication
export { default as ProtectedRoute, ConditionalRender, usePermissionCheck } from './ProtectedRoute'
export { default as RouteGuard, RoleGuard, PermissionGuard, useAccessControl } from './RouteGuard'
export { default as TabbedSection } from './TabbedSection'

// Session management
export { default as SessionManager, useSessionStatus } from './SessionManager'

// Notifications
export { default as NotificationContainer } from './NotificationContainer'