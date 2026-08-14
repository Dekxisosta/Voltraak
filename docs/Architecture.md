# Architecture

## Inventory Management System (IMS) — WalangBrownout Appliances

**Status:** Draft
**Companion docs:** `PRD.md`, `Backend/Project-Structure.md`, `Backend/API.md`, `Database/Database.md`, `Backend/Services.md`

---

## 1. System Overview

Modular monolith with containerized development environment:

| Container | Stack | Responsibility |
|---|---|---|
| Frontend | React SPA (JavaScript, Vite) | Role-based UI with mock/API toggle, dark/light theming |
| Backend | Laravel (PHP), MVC + Controller-Service-Repository | REST API + business logic, organized into 4 modules |
| Database | MySQL | Inventory, transactions, batches, purchase orders, users |
| Infrastructure | Docker Compose, Nginx, Redis | Development environment with cache and reverse proxy |

**Development Architecture:** Frontend operates with mock data by default, toggling to backend via `VITE_DATA_SOURCE` environment variable. This enables parallel development and independent testing.

"Modular monolith" means one deployable Laravel backend with internal module boundaries — new integrations (POS, supplier portal, mobile scanning) can be added as new modules without reworking existing boundaries (see §5, Extensibility).

## 2. Backend Modules

| Module | Responsibility |
|---|---|
| **Inventory Module** | Stock in/out, batches, reservations, physical-count reconciliation, FEFO enforcement, damage/discrepancy reports |
| **Procurement Module** | Demand forecasting, ROP calculation, replenishment requests, supplier/PO management |
| **Reporting Module** | KPI aggregation, inventory/procurement reports, forecast summaries |
| **User Management Module** | Auth (JWT/session) and role-based authorization |

Each module above is also a physical folder under `backend/app/Modules/` — Controllers, Services,
Repositories, Models, etc. are grouped by module rather than by technical layer. See
`Backend/Project-Structure.md` for the full modular-monolith file structure this maps to.

Module detail (endpoints, formulas, sequence flows) lives in `Backend/`, not here — this doc stays
at the "what are the boxes and why" level.

## 3. Roles & Access Model

Three roles with enforced server-side permissions and client-side route guards:

| Role | Access Scope | Frontend Pages |
|---|---|---|
| **Warehouse Staff** | Stock receiving, picking, damage reports | `/warehouse/*` - mobile-optimized task interfaces |
| **Inventory Staff** | Stock transactions, batch management, physical counts | `/inventory/*` - data entry and monitoring |
| **Manager** | All operations plus reports, approvals, forecasting | `/manager/*` - dashboard and decision-support |

**Security Model:**
- **Server-side:** Role-based access control enforced on every mutating API endpoint
- **Client-side:** Route guards (`ProtectedRoute`, role-specific routing) provide UX optimization only
- **Authentication:** JWT-based with automatic refresh and session management
- **Session Management:** Automatic expiry warnings, silent token refresh, secure logout

Role determination happens at login and drives both API permissions and UI navigation structure.

## 4. Branching Strategy

Per the Software Architecture Document §3.1:

```
main (stable, PR-only) ← develop (integration) ← feature/<sprint>-<description>
                                                 ← fix/<description>
```

Every feature/fix branch is a reviewed PR into `develop`.

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Data integrity** | Every stock movement must be transactional (DB transaction wrapping quantity update + log insert) — no partial writes |
| **Auditability** | Every `stock_transactions` and `physical_counts` row must carry `user_id`/`counted_by` — no anonymous mutations |
| **Latency** | Stock level reads (dashboards, stock-out validation) should reflect writes within the same request cycle — no eventual-consistency lag acceptable for oversell prevention |
| **Availability** | Core stock-in/stock-out/reservation flows are business-critical; target uptime should match warehouse operating hours at minimum |
| **Extensibility** | New integrations (POS, supplier portal, mobile scanning) must be addable as new modules/services without modifying existing Inventory/Procurement/Reporting/User Management boundaries |
| **Security** | Passwords hashed (never plaintext), JWT/session expiry enforced, role checks server-side on every mutating endpoint |
| **Development Experience** | Frontend must operate independently with mock data; environment toggle between mock and real API |
| **Responsive Design** | Warehouse interfaces mobile-optimized, inventory staff tablet-friendly, manager desktop-focused |
| **Theme Support** | Light/dark mode with system preference detection, user preference persistence |

## 6. Diagrams

C4 Context/Container/Component/Code diagrams are the source of truth for the visual architecture
and live in the Software Architecture Document. This folder previously reserved an
`architecture/` directory for exported copies of those diagrams — currently empty in this
checkout; add exports there and link them here when available.

## 7. Current Implementation Status

### Frontend Architecture ✅
- **Shared library structure:** All reusable code organized in `src/shared/` 
- **Role-based routing:** Pages separated by user role with protected routes
- **Authentication system:** Complete JWT auth with session management
- **Theme system:** Light/dark mode with system preference detection
- **API client:** Robust fetch wrapper with error handling and authentication
- **Mock/API toggle:** Environment variable controls data source
- **Testing infrastructure:** API testing, auth flow testing, Vitest setup

### Backend Foundation ✅ 
- **Module structure:** Laravel organized into 4 business modules
- **Demo API endpoints:** Basic auth, products, dashboard KPIs implemented
- **Docker development:** Complete containerized environment
- **Database schema:** Core tables defined (see Database documentation)

### In Progress 🚧
- **Complete API implementation:** Moving from demo endpoints to full module implementation
- **Real backend integration:** Transitioning from frontend mocks to actual Laravel API
- **Business logic:** FEFO algorithms, ROP calculations, variance detection

### Environment Configuration
```bash
# Development (default)
VITE_DATA_SOURCE=mocks          # Use mock data
VITE_API_BASE_URL=http://localhost:8000/api

# Backend integration  
VITE_DATA_SOURCE=api            # Use real Laravel API
```

## 8. Development Workflow

### Branch Strategy
```
main (stable, PR-only) ← develop ← feature/<sprint>-<description>
                                 ← fix/<description>
```

### Environment Setup
1. **Frontend development:** `npm run dev` (uses mocks by default)
2. **Full stack development:** Set `VITE_DATA_SOURCE=api` + `docker compose up`
3. **Testing:** `npm run test` or `npm run test:ui` for UI

### Testing Approach
- **Frontend isolation:** Test with mocks first (`?test=api`, `?test=auth`)
- **Integration testing:** Verify frontend + backend with real API calls
- **Role-based testing:** Each role has dedicated test scenarios

### Code Quality
- **ESLint:** Enforces imports, unused variables, React patterns
- **Prettier:** Code formatting 
- **Granular commits:** Small, focused commits with clear messages

## 9. Open Questions

- Confirm supplier lead time (`L`, used in the ROP formula — see `Backend/Services.md`) is stored
  per supplier-product pair or per supplier only.
- Confirm barcode/QR payload format (product SKU only, or SKU + batch number) to fully automate
  receiving-to-batch creation.
- Finalize transition timeline from mock data to full backend integration.
