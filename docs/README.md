# Documentation Index

| Doc | Purpose | Status |
|---|---|---|
| `PRD.md` | Problem statement, goals, users, features, success metrics, release plan | ✅ Current |
| `Architecture.md` | System overview, backend modules, roles/access model, branching strategy, NFRs | ✅ Updated |
| `Backend/Project-Structure.md` | Modular-monolith backend file structure — Core/Modules/Support/Providers/Console | ✅ Current |
| `Backend/API.md` | Full REST API spec — all 55 endpoints, grouped by module, sprint-mapped build order, RBAC summary | 🚧 Needs Update |
| `Backend/Services.md` | Core business logic — ROP/FEFO/variance formulas, key sequence flows | ✅ Current |
| `Database/Database.md` | Data model — tables, relationships, design notes, migration order | ✅ Current |
| `Frontend/Overview.md` | Stack, shared folder structure, API client layer, environment config | ✅ Updated |
| `Frontend/Routing.md` | Route table, role-based protection, modular route definitions | ✅ Updated |
| `Frontend/Components.md` | Shared component catalog (layout + common) | 🚧 Needs Update |
| `Frontend/State-Management.md` | Auth/theme contexts, notification system, server-state pattern | ✅ Updated |
| `Frontend/Styling.md` | Design tokens (status colors), global styles, theme system | 🚧 Needs Update |
| `Frontend/Design-System.md` | Shell layout, status-color language, table/form patterns, chart + responsive decisions | 🚧 Needs Update |
| `Frontend/Pages.md` | Screen-by-screen inventory by role, backend deps per screen | 🚧 Needs Update |
| `QA/Test-Plan.md` | Test scope, strategy, environments, sprint-mapped entry/exit criteria | ✅ Current |
| `QA/Test-Cases.md` | Scenario-level test cases by role/module, with status + last-verified tracking | ✅ Current |
| `QA/Bug-Log.md` | Bug/issue tracker | ✅ Current |

## Major Architecture Changes (Recent)

### Frontend Reorganization ✅
- **Shared Library:** All reusable code moved to `src/shared/` organized by type
- **Role-Based Pages:** Pages organized by user role (`pages/warehouse/`, `pages/inventory/`, `pages/manager/`)
- **Modular Routing:** Route definitions split by role with protected layouts
- **Mock/API Toggle:** Environment variable controls data source (`VITE_DATA_SOURCE`)

### Authentication & Session Management ✅
- **JWT-Based Auth:** Complete authentication system with automatic refresh
- **Session Security:** Expiry warnings, timeout handling, silent refresh
- **Role-Based Navigation:** Automatic routing based on user roles

### Theme System ✅
- **Dark/Light Mode:** Complete theme system with system preference detection
- **CSS Variables:** Uses `data-theme` for styling consistency
- **User Preferences:** Minimal localStorage usage for theme preference only

### Development Experience ✅
- **Independent Frontend:** Can develop with mock data without backend dependency
- **Testing Infrastructure:** API testing, auth flow testing, comprehensive test setup
- **Code Quality:** ESLint with import validation, unused variable detection

## Current Implementation Status

### ✅ Completed
- Frontend shared library architecture
- Authentication and session management system
- Theme system with dark/light mode support
- Mock data infrastructure for independent development
- Docker development environment setup
- Backend module structure (Laravel)
- Basic API endpoints for authentication and demo data

### 🚧 In Progress  
- Full backend API implementation (transitioning from demo endpoints)
- Frontend-backend integration (moving from mocks to real API)
- Business logic implementation (FEFO, ROP calculations)
- Complete UI component library
- Comprehensive page implementations

### 📋 Planned
- Production deployment configuration
- Performance optimization and caching
- Advanced reporting and analytics features
- Mobile app considerations
- Third-party integrations (POS systems, etc.)

## Read Order for New Contributors

**Quick Start:** PRD.md → Architecture.md → Frontend/Overview.md → Backend/Project-Structure.md

**Frontend Development:** Frontend/Overview.md → Frontend/Routing.md → Frontend/State-Management.md → Frontend/Components.md

**Backend Development:** Backend/Project-Structure.md → Backend/API.md → Backend/Services.md → Database/Database.md

**Full System Understanding:** All docs in order listed above, then check current implementation status in specific module directories.
