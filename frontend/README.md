# Voltraak IMS Frontend

Modern React frontend for the Voltraak Inventory Management System built for WalangBrownout Appliances.

## 🚀 Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling with custom design system
- **React Router DOM** for client-side routing
- **Lucide React** for consistent iconography
- **ESLint & Prettier** for code quality

## 📁 Project Structure

```
src/
├── api/              # Typed API clients per backend module
├── components/       # Shared components
│   ├── common/       # Generic reusable components
│   └── layout/       # Layout-specific components
├── features/         # Feature-scoped screens and components
├── hooks/            # Custom React hooks
├── pages/            # Role-scoped page components
│   ├── auth/         # Authentication pages
│   ├── dashboard/    # Dashboard pages
│   └── {role}/       # Role-specific pages
├── routes/           # Route definitions and guards
├── styles/           # Global styles and design tokens
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## 🎨 Design System

### Status Colors
- **Green (#22c55e)**: In-stock, safe batches, confirmed actions
- **Amber (#f59e0b)**: Low stock, warning batches (≤60 days), pending states
- **Red (#ef4444)**: Out of stock, expired batches, rejected items
- **Slate (#94a3b8)**: Default/unset states

### Component Classes
- `.status-badge`: Semantic status indicators
- `.btn`: Button variations (primary, secondary, success, warning, danger, ghost)
- `.card`: Consistent card layout with header/body/footer
- `.nav-link`: Navigation menu styling
- `.form-input`, `.form-label`, `.form-error`: Form styling

## 🔐 Authentication & Authorization

### Role Hierarchy
- **Warehouse Staff**: Basic inventory operations, mobile-optimized
- **Inventory Staff**: Full inventory management, tablet-friendly
- **Manager**: Complete system access, desktop-focused

### Route Protection
```tsx
// Role-based route protection
<ProtectedRoute roles={['manager']}>
  <UserManagementPage />
</ProtectedRoute>

// Permission-based protection
<ConditionalRender permissions={['inventory.create']}>
  <CreateProductButton />
</ConditionalRender>
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm 8+

### Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript checks
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run coverage     # Generate test coverage
```

## 📱 Responsive Design

### Breakpoints (Tailwind CSS)
- `sm`: 640px and up
- `md`: 768px and up  
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

### Priority Order
1. **Warehouse Staff**: Full mobile/tablet responsive
2. **Inventory Staff**: Tablet-friendly with desktop optimization  
3. **Manager**: Desktop-first approach

## 🔌 API Integration

### Backend Integration
- Base URL: `http://localhost:8000/api`
- Authentication: JWT + Sanctum tokens
- Request/Response: JSON with standardized format

### API Client Pattern
```typescript
// Typed API clients per module
import { inventoryApi } from '@/api/inventory'

const products = await inventoryApi.getProducts({
  search: 'laptop',
  category: 'electronics'
})
```

## 🧪 Testing

### Testing Stack
- **Vitest**: Fast unit testing
- **Testing Library**: Component testing
- **jsdom**: Browser environment simulation

### Test Organization
```
src/
├── __tests__/        # Global test utilities
├── components/
│   └── __tests__/    # Component tests
└── hooks/
    └── __tests__/    # Hook tests
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
See `.env.example` for required configuration:
- `VITE_API_BASE_URL`: Backend API endpoint
- `VITE_APP_NAME`: Application name
- `VITE_APP_ENV`: Environment (development/production)

### Build Output
- Static files in `dist/` directory
- Optimized for CDN deployment
- Source maps included for debugging

## 🎯 Features

### Core Functionality
- ✅ JWT-based authentication with auto-refresh
- ✅ Role-based access control and route guards
- ✅ Responsive design system with Tailwind CSS
- ✅ Toast notifications with action support
- ✅ Error boundary with graceful error handling
- ✅ Loading states and skeleton screens

### Module Integration (Planned)
- 🔄 Inventory management with FEFO enforcement
- 🔄 Procurement workflow and purchase orders  
- 🔄 Real-time reporting and analytics
- 🔄 User management and role administration

## 📚 Documentation

- [Design System](../docs/Frontend/Design-System.md)
- [Component Library](../docs/Frontend/Components.md)
- [Routing & Navigation](../docs/Frontend/Routing.md)
- [State Management](../docs/Frontend/State-Management.md)
- [API Integration](../docs/Frontend/API-Integration.md)

## 🤝 Contributing

1. Follow the established file structure and naming conventions
2. Use TypeScript for all new code with proper type definitions
3. Follow the design system for consistent UI/UX
4. Write tests for new components and hooks
5. Use semantic commit messages

## 📄 License

Built for WalangBrownout Appliances. All rights reserved.