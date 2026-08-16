# Design System & UI Guidelines

## Visual Identity

**Theme:** Professional inventory management interface
**Approach:** Function-first design prioritizing clarity and operational efficiency
**Target Users:** Warehouse staff (mobile-friendly), Inventory staff, Managers (desktop-focused)

## Color System

### Status Colors (Primary Language)
```typescript
const statusColors = {
  ok: "#22c55e",       // In-stock, Safe batches, Confirmed actions
  warning: "#f59e0b",  // Low stock, Warning batches (≤60 days), Pending states
  critical: "#ef4444", // Out of stock, Expired batches, Rejected items
  neutral: "#94a3b8"   // Default/unset states
}
```

**Usage Rule:** Status must never be color-only. Always pair colors with text labels and icons for accessibility.

### Layout Colors
- **Sidebar Background:** `#1e293b` (dark slate)
- **Content Background:** Light/white
- **Text:** Follow Tailwind's semantic color scale

## Layout Patterns

### Shell Structure
- **Fixed sidebar:** 220px dark sidebar with role-based navigation
- **Content area:** Light background with consistent 24px outer padding
- **Full viewport height:** No scroll on shell, scroll within content areas
- **No nested navigation:** Flat navigation structure in sidebar

### Page Layouts

#### List/Table Screens
```
┌─ Filters/Search (horizontal bar)
├─ Data Table
│  ├─ Sortable column headers
│  ├─ StatusBadge in relevant columns
│  └─ Consistent row styling
└─ Pagination (when needed)
```

#### Transaction Entry Screens
```
┌─ Entry Form (top section)
│  ├─ Input fields
│  ├─ Action buttons
│  └─ Immediate feedback/calculations
└─ Recent Entries Log (bottom section)
   └─ Shows immediate confirmation of actions
```

## Component Guidelines

### StatusBadge Usage
```typescript
<StatusBadge 
  tone="warning" 
  label="Low Stock" 
  icon={AlertTriangle} 
/>
```
- Always include descriptive label text
- Pair with appropriate Lucide React icon
- Use consistent tone mapping across contexts

### Icon Library
- **Source:** Lucide React only
- **Import pattern:** Individual imports (`import { AlertTriangle } from "lucide-react"`)
- **Usage:** Functional icons supporting content, not decorative

### Animation Standards
- **Approach:** Subtle, purposeful motion enhancing usability
- **Implementation:** CSS transitions and animations
- **Candidates:** Route transitions, active states, notifications, table updates

## Responsive Strategy

### Priority Order
1. **Warehouse Staff screens:** Full mobile/tablet responsive (used on warehouse floor)
2. **Inventory Staff screens:** Tablet-friendly with desktop optimization
3. **Manager screens:** Desktop-first (can assume larger viewports)

### Breakpoint Approach
- Use Tailwind's default breakpoints
- Mobile-first approach for Warehouse screens
- Progressive enhancement for larger screens

## Typography & Spacing

### Font Stack
- System font stack (inherited from Tailwind base)
- Consistent with modern web standards
- Optimized for operational readability

### Spacing Scale
- Follow Tailwind's spacing scale (4px base unit)
- Consistent padding: 24px outer content padding
- Maintain visual hierarchy through consistent spacing

## Data Display Patterns

### Tables
- Sortable headers where applicable
- Consistent column widths and alignment
- Row-level status indicators
- Filter controls above table, not inline per-column

### Forms
- Clear field labels and validation feedback
- Immediate calculation display (variance, accuracy percentages)
- Action buttons with clear loading/success states

### Charts (Future Implementation)
- **Decision needed:** Choose between Recharts vs Chart.js
- **Required charts:** 8-week demand forecast, KPI trends, category breakdowns
- Consistent color palette using status color system

## Accessibility Requirements

### Color & Contrast
- Status information must include text and icons, never color alone
- Meet WCAG contrast requirements for text readability
- Test with common color vision deficiencies

### Interaction
- Keyboard navigation support for all interactive elements
- Clear focus indicators
- Logical tab order through forms and interfaces

## File Organization

### Component Structure
```
components/
├── common/        # Cross-role shared components (StatusBadge, etc.)
└── layout/        # Shell components (AppShell, Sidebar)
```

### Styling Structure
```
styles/
├── index.css      # Tailwind imports + globals
└── tokens.ts      # Design token source of truth
```

## Development Conventions

### CSS Approach
- **Primary:** Tailwind utility classes
- **Token usage:** Import from `tokens.ts`, no hardcoded colors
- **Status colors:** Use Tailwind `bg-status-*` classes, not direct token imports

### Component Patterns
- Props-based data, no internal data fetching
- Consistent TypeScript prop interfaces
- Role/permission context passed down from page level

### Animation Implementation
```css
/* Use CSS transitions for smooth state changes */
.status-badge {
  transition: background-color 0.2s ease-in-out;
}

.nav-link:hover {
  transition: all 0.2s ease-in-out;
}
```

## Business Context Integration

### Role-Based Design
- **Warehouse Staff:** Task-focused, minimal cognitive load, mobile-optimized
- **Inventory Staff:** Data-entry efficient, immediate feedback loops
- **Manager:** Information-dense, reporting-focused, decision-support oriented

### Domain-Specific Patterns
- **Stock levels:** Consistent status badge usage across all contexts
- **FEFO compliance:** Visual cues for expiry-based picking order
- **Variance display:** Immediate calculation feedback on physical counts
- **Approval workflows:** Clear pending/approved/rejected state visualization