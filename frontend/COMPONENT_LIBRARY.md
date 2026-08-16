# Voltraak Frontend Component Library

This document outlines the shared components implemented for the Voltraak inventory management system.

## 📁 Component Organization

```
src/components/
├── common/           # Reusable UI components
│   ├── Button.tsx    # Button variants with loading states
│   ├── Input.tsx     # Form inputs with validation
│   ├── Select.tsx    # Dropdown selects with options
│   ├── StatusBadge.tsx # Semantic status indicators
│   ├── Badge.tsx     # Generic badges and labels
│   ├── Card.tsx      # Container components
│   ├── Table.tsx     # Data tables with sorting
│   ├── Modal.tsx     # Modal dialogs and overlays
│   ├── Pagination.tsx # Page navigation
│   ├── SearchBar.tsx # Advanced search with suggestions
│   ├── FilterPanel.tsx # Data filtering interface
│   ├── Tooltip.tsx   # Contextual help
│   └── index.ts      # Exports all components
└── layout/           # Layout-specific components
    ├── AppShell.tsx  # Main application layout
    ├── Sidebar.tsx   # Navigation sidebar
    ├── Header.tsx    # Top navigation bar
    ├── PageHeader.tsx # Page title and breadcrumbs
    └── index.ts      # Exports all layouts
```

## 🎨 Core Components

### Button Component
Consistent button styling with variants and states:

```tsx
import { Button, PrimaryButton, DangerButton } from '@/components/common'

// Basic usage
<Button variant="primary" size="md" loading={isSubmitting}>
  Save Changes
</Button>

// Convenience components
<PrimaryButton icon={Save}>Save</PrimaryButton>
<DangerButton icon={Trash}>Delete</DangerButton>
```

**Variants**: `primary`, `secondary`, `success`, `warning`, `danger`, `ghost`
**Sizes**: `sm`, `md`, `lg`
**Features**: Loading states, icons, full width, disabled states

### Input Components
Form inputs with validation and accessibility:

```tsx
import { Input, SearchInput, NumberInput, PasswordInput } from '@/components/common'

<Input
  label="Product Name"
  error={errors.name}
  leftIcon={Package}
  placeholder="Enter product name"
  required
/>

<NumberInput
  label="Quantity"
  min={0}
  max={9999}
  value={quantity}
  onChange={(e) => setQuantity(e.target.value)}
/>
```

**Features**: Label, error states, help text, icons, password visibility toggle

### StatusBadge Component
Semantic status indicators with accessibility compliance:

```tsx
import { StatusBadge, StockStatusBadge, BatchStatusBadge } from '@/components/common'

<StatusBadge variant="warning" label="Low Stock" />
<StockStatusBadge 
  currentStock={15} 
  minimumStock={10} 
  reorderPoint={25} 
/>
<BatchStatusBadge expiryDate="2024-12-31" />
```

**Variants**: `ok`, `warning`, `critical`, `neutral`
**Features**: Always includes text + icon for accessibility, never color-only

### Table Component
Responsive data tables with sorting and loading states:

```tsx
import { Table, useTableSort } from '@/components/common'

const columns = [
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'stock', label: 'Stock', render: (value) => formatNumber(value) },
  { key: 'status', label: 'Status', render: (_, row) => <StockStatusBadge {...row} /> }
]

const { sortOptions, handleSort } = useTableSort({ field: 'name', direction: 'asc' })

<Table
  data={products}
  columns={columns}
  loading={isLoading}
  onSort={handleSort}
  sortOptions={sortOptions}
  striped
/>
```

**Features**: Sorting, loading states, responsive design, empty states

## 🎯 Specialized Components

### SearchBar Component
Advanced search with suggestions and filters:

```tsx
import { SearchBar, useSearch } from '@/components/common'

const { searchTerm, setSearchTerm } = useSearch()

<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  onSearch={handleSearch}
  suggestions={productNames}
  showFilters
  filters={<FilterComponents />}
/>
```

### Modal Component
Accessible modal dialogs with focus management:

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from '@/components/common'

<Modal isOpen={isOpen} onClose={onClose} title="Edit Product">
  <ModalBody>
    <ProductForm />
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onSave}>Save</Button>
  </ModalFooter>
</Modal>

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  message="Are you sure you want to delete this product?"
  variant="danger"
/>
```

### FilterPanel Component
Structured data filtering with context management:

```tsx
import { FilterPanel, FilterGroup, DateRangeFilter, StatusFilter, useFilters } from '@/components/common'

const { filters, isOpen, openFilters, closeFilters, applyFilters, resetFilters } = useFilters()

<FilterPanel
  isOpen={isOpen}
  onClose={closeFilters}
  onApply={applyFilters}
  onReset={resetFilters}
>
  <DateRangeFilter />
  <StatusFilter options={statusOptions} />
  <FilterGroup title="Categories">
    <CategoryFilter />
  </FilterGroup>
</FilterPanel>
```

## 🏗️ Layout Components

### PageHeader Component
Consistent page headers with breadcrumbs:

```tsx
import { PageHeader, PageContainer } from '@/components/layout'

<PageContainer>
  <PageHeader
    title="Product Management"
    subtitle="Manage your inventory products"
    breadcrumbs={[
      { label: 'Inventory', href: '/inventory' },
      { label: 'Products' }
    ]}
    actions={
      <Button variant="primary" icon={Plus}>
        Add Product
      </Button>
    }
  />
</PageContainer>
```

### Enhanced Sidebar
Role-based navigation with user context:

```tsx
// Automatically handles role-based menu visibility
// Shows user profile and status
// Responsive mobile menu support
```

## 🎨 Design System Integration

All components follow the established design system:

### Color Semantics
- **Green (#22c55e)**: Success, in-stock, safe
- **Amber (#f59e0b)**: Warning, low stock, expiring
- **Red (#ef4444)**: Error, critical, expired
- **Slate (#94a3b8)**: Neutral, default states

### Consistent Spacing
- **4px base unit**: All spacing follows 4px increments
- **24px container padding**: Standard content padding
- **Component spacing**: Consistent gaps and margins

### Typography Scale
- **Headings**: 2xl, xl, lg with proper hierarchy
- **Body text**: Base size with consistent line heights
- **Small text**: Captions, help text, metadata

## 🔧 Usage Patterns

### Form Components
```tsx
import { Input, Select, Button, Card, CardHeader, CardBody } from '@/components/common'

<Card>
  <CardHeader>
    <h2>Product Information</h2>
  </CardHeader>
  <CardBody>
    <div className="grid grid-cols-2 gap-4">
      <Input label="Name" {...register('name')} />
      <Select label="Category" options={categories} {...register('category')} />
    </div>
    <Button type="submit" variant="primary" loading={isSubmitting}>
      Save Product
    </Button>
  </CardBody>
</Card>
```

### Data Display
```tsx
import { Table, StatusBadge, Badge, Pagination } from '@/components/common'

const columns = [
  { key: 'name', label: 'Product', sortable: true },
  { 
    key: 'status', 
    label: 'Status', 
    render: (_, row) => <StockStatusBadge {...row} />
  },
  {
    key: 'category',
    label: 'Category',
    render: (category) => <Badge variant="secondary">{category}</Badge>
  }
]

<>
  <Table data={products} columns={columns} />
  <Pagination
    currentPage={page}
    totalPages={totalPages}
    onPageChange={setPage}
  />
</>
```

## 📱 Responsive Design

All components are mobile-first responsive:

### Breakpoints
- **sm**: 640px+ (Mobile landscape)
- **md**: 768px+ (Tablet)
- **lg**: 1024px+ (Desktop)
- **xl**: 1280px+ (Large desktop)

### Responsive Patterns
- **Tables**: Switch to card layout on mobile
- **Modals**: Adjust sizing and padding
- **Forms**: Stack fields vertically on small screens
- **Navigation**: Collapsible sidebar with overlay

## ♿ Accessibility

Components follow WCAG 2.1 guidelines:

- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Screen readers**: Proper ARIA labels and roles
- **Focus management**: Visible focus indicators and logical tab order
- **Color contrast**: All text meets minimum contrast requirements
- **Semantic HTML**: Proper heading hierarchy and landmark elements

## 🧪 Testing

Each component includes:
- **Unit tests**: Component behavior and props
- **Integration tests**: Component interaction with context
- **Accessibility tests**: Screen reader and keyboard navigation
- **Visual regression tests**: Design system compliance

## 📚 Documentation

Each component includes:
- **TypeScript interfaces**: Complete prop definitions
- **JSDoc comments**: Usage examples and guidelines
- **Storybook stories**: Interactive component playground
- **Design tokens**: Consistent styling references

This component library provides a solid foundation for building the complete Voltraak inventory management system with consistent design, behavior, and accessibility.