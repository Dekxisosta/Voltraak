# Frontend — Overview

## Inventory Management System (IMS) — WalangBrownout Appliances

**Stack:** React SPA, JavaScript, Vite, Tailwind CSS, lucide-react
**Companion docs:** `../PRD.md`, `../Architecture.md`, `../Backend/API.md`

---

## 1. Stack & Entry Point

- **Build tool:** Vite
- **Language:** JavaScript (not TypeScript) with ESLint for code quality
- **Router:** `react-router-dom` (`BrowserRouter`)
- **Entry:** `frontend/src/main.jsx` mounts `<App />` inside `<BrowserRouter>` and imports the
  global stylesheet (`styles/index.css`).
- **`App.jsx`** provides the application shell with providers (ThemeProvider, NotificationProvider, AuthProvider) and routes through `<AppRoutes />`. Includes test mode integration for API and auth testing via URL parameters.
- **Styling:** Tailwind CSS with custom design tokens — see `Styling.md` for the token system and theme integration.
- **Icons:** `lucide-react` — see `Components.md` for `StatusBadge`'s icon usage and other components.

## 2. Folder Structure (Shared Architecture)

```
frontend/src/
├── shared/         ALL shared functionality organized by type
│   ├── api/        API layer — one file per backend module + unified client.js
│   ├── components/ Reusable UI components
│   │   ├── common/ Cross-role shared components (StatusBadge, etc.)
│   │   └── layout/ Shell/navigation components (AppShell, Sidebar)
│   ├── contexts/   React contexts (AuthContext, ThemeContext)
│   ├── hooks/      Custom React hooks (useAuth, useNotifications, etc.)
│   ├── services/   Business logic and utilities
│   └── utils/      Pure utility functions
├── pages/          Role-scoped screens organized by user role
│   ├── auth/       Login, forgot password, etc.
│   ├── dashboard/  Shared dashboard components
│   ├── inventory/  Inventory staff specific pages  
│   ├── manager/    Manager role specific pages
│   └── warehouse/  Warehouse staff specific pages
├── routes/         Route definitions and guards
│   ├── AppRoutes.jsx        Main router with protected layouts
│   ├── inventory/           Role-specific route definitions
│   ├── manager/
│   └── warehouse/
├── styles/         Global styles and design tokens
├── test/           Testing utilities and components
└── __tests__/      Test files
```

Configuration files live at project root: `frontend/vite.config.js`, `frontend/tailwind.config.js`, `frontend/.eslintrc.cjs`.

## 3. Talking to the Backend

### Environment Configuration
The frontend can work with either mock data or the actual Laravel backend API:
- **VITE_DATA_SOURCE=mocks** (default): Uses local mock data for development
- **VITE_DATA_SOURCE=api**: Connects to real backend at VITE_API_BASE_URL

### API Client Architecture
`shared/api/client.js` is a comprehensive fetch wrapper (`apiClient.get/post/patch/delete/upload`) that every
`shared/api/*.js` file builds on. It provides:

- **Base URL management:** Reads from `VITE_API_BASE_URL` (falls back to `http://localhost:8000/api`)
- **Authentication:** Attaches bearer token from localStorage on every request
- **Error handling:** On `401`, clears token and redirects to `/login`; structured error handling for validation errors
- **Request/Response processing:** JSON handling, query parameter building, file upload support
- **Timeout support:** Configurable request timeouts using AbortSignal

Module-specific API files (`auth.js`, `inventory.js`, etc.) wrap `apiClient` with typed methods per endpoint — see `../Backend/API.md` for the endpoints each should cover.

### Authentication & Session Management
The AuthContext provides comprehensive session management:
- **Token management:** JWT token storage and refresh
- **Session timeout:** Automatic warnings and expiry handling
- **Role-based routing:** Automatic redirects based on user roles
- **Silent refresh:** Background token renewal

## 4. Environment Configuration & Feature Flags

Environment variables control both backend integration and development features:

```bash
# Data source toggle - key architectural decision
VITE_DATA_SOURCE=mocks                    # or "api" for backend integration

# API configuration (when DATA_SOURCE=api)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Voltraak IMS
VITE_APP_VERSION=1.0.0

# Development features
VITE_ENABLE_DEV_TOOLS=true               # Development utilities
VITE_ENABLE_DEBUG_MODE=true              # Debug logging

# Authentication keys
VITE_JWT_STORAGE_KEY=voltraak_token      # Token storage key
VITE_API_TOKEN_STORAGE_KEY=voltraak_api_token
VITE_USER_STORAGE_KEY=voltraak_user
```

Copy `frontend/.env.example` to `.env` before running — see root `README.md` for setup instructions.

## 5. Theme System

The application supports light/dark mode with system preference detection:
- **ThemeContext:** Manages theme preference (light/dark/system) 
- **CSS Variables:** Uses `data-theme` attribute for styling
- **Persistence:** Stores only theme preference (not user data) in localStorage
- **System Integration:** Automatically follows system dark/light preference when set to "system"

## 6. Testing & Development Tools

The frontend includes comprehensive testing capabilities:
- **API Testing:** `?test=api` URL parameter loads API test interface
- **Auth Flow Testing:** `?test=auth` URL parameter loads authentication flow testing
- **Vitest:** Test runner with UI support (`npm run test:ui`)
- **ESLint:** Code quality with import validation and unused variable detection

## 7. Key Architectural Decisions

### Mock-First Development
- Frontend can operate independently with mock data during development
- Toggle between mocks and API via environment variable
- Enables parallel frontend/backend development

### Role-Based Architecture
- Pages organized by user role (warehouse, inventory, manager)
- Role-specific routing with guards
- Shared components in common library

### Shared Library Pattern
- All reusable code lives in `src/shared/`
- Clear separation between shared utilities and role-specific pages
- Promotes code reuse and consistency

## 8. Where Things Go From Here

- Routing & role guards → `Routing.md`
- Shared component catalog → `Components.md`
- Auth/session state details → `State-Management.md`
- Design tokens & theming → `Styling.md`
- Visual design patterns → `Design-System.md`
- Screen-by-screen inventory → `Pages.md`
