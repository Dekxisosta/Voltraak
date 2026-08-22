# Frontend — Routing

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Overview.md`, `State-Management.md`, `../Backend/API.md` (§RBAC)

---

## 1. Route Architecture

Routes are organized by role with modular route definitions:

```
routes/
├── AppRoutes.jsx          # Main router with protected layouts
├── inventory/             # Inventory staff routes
│   └── InventoryRoutes.jsx
├── manager/               # Manager routes  
│   └── ManagerRoutes.jsx
└── warehouse/             # Warehouse staff routes
    └── WarehouseRoutes.jsx
```

Each role has its own route file that defines both public and protected routes for that domain.

## 2. Current Route Table

Defined across role-specific route files, each group protected by authentication and role checks:

### Public Routes
| Path | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Authentication |
| `/forgot-password` | `ForgotPasswordPage` | Password recovery |

### Protected Routes (Role-Based)
| Path | Role(s) | Page | Status |
|---|---|---|---|
| `/dashboard` | all authenticated | `DashboardPage` | ✅ Implemented |
| `/warehouse/receiving` | warehouse, manager | `ReceivingPage` | 🚧 In Progress |
| `/warehouse/picking` | warehouse, manager | `PickingPage` | 🚧 In Progress |
| `/warehouse/fefo` | warehouse, manager | `FEFOPage` | 🚧 In Progress |
| `/warehouse/discrepancies` | warehouse, manager | `DiscrepanciesPage` | 🚧 In Progress |
| `/inventory/stock-in-out` | inventory_staff, manager | `StockInOutPage` | 🚧 In Progress |
| `/inventory/damage-report` | inventory_staff, manager | `DamageReportPage` | 🚧 In Progress |
| `/inventory/item-update` | inventory_staff, manager | `ItemUpdatePage` | 🚧 In Progress |
| `/inventory/stock-levels` | inventory_staff, manager | `StockLevelsPage` | 🚧 In Progress |
| `/inventory/reservations` | inventory_staff, manager | `ReservationsPage` | 🚧 In Progress |
| `/inventory/expiry-alerts` | inventory_staff, manager | `ExpiryAlertsPage` | 🚧 In Progress |
| `/manager/kpi` | manager | `KPIDashboardPage` | 🚧 In Progress |
| `/manager/forecast` | manager | `ForecastReportsPage` | 🚧 In Progress |
| `/manager/reports` | manager | `InventoryReportsPage` | 🚧 In Progress |
| `/manager/low-stock` | manager | `LowStockAlertsPage` | 🚧 In Progress |
| `/manager/po-approvals` | manager | `POApprovalsPage` | 🚧 In Progress |

Manager role has access to all warehouse and inventory routes (hierarchical permissions).

## 3. Route Protection — `ProtectedRoute` & Role Guards

### Authentication Guard
`ProtectedRoute` component (in AppRoutes.jsx):
- Checks authentication status via `useAuth()`
- Redirects to `/login` if not authenticated
- Shows loading state while auth is being verified

### Role-Based Access
Routes are further protected by role-specific checks:
- Each role-specific router checks `user.role` matches allowed roles
- Manager role has access to all warehouse and inventory routes
- Unauthorized access redirects to appropriate dashboard

**Important:** This is UX-only protection. Server-side RBAC enforcement happens at the API level (`../Backend/API.md` §RBAC).

## 4. Root Redirect Logic

`/` redirects based on authentication and role:

| State | Destination |
|---|---|
| Not authenticated | `/login` |
| `role === "warehouse"` | `/dashboard` (with warehouse-specific content) |
| `role === "inventory_staff"` | `/dashboard` (with inventory-specific content) |
| `role === "manager"` | `/dashboard` (with manager dashboard) |

The dashboard serves as the universal landing page with role-specific content, rather than role-specific landing pages.

## 5. Error Handling & Navigation

### Route Error Boundaries
- `ErrorBoundary` components wrap route groups to catch navigation errors
- Failed route loads show user-friendly error messages
- Automatic fallback to appropriate dashboard on error

### Navigation State
- Route state preserved during authentication flows
- `from` parameter allows returning users to intended destination after login
- Session expiry redirects preserve route intent for re-authentication

## 6. Adding New Routes

### For New Pages within Existing Roles:
1. Add page component under appropriate `pages/{role}/` directory
2. Import in corresponding `routes/{role}/{Role}Routes.jsx`
3. Add `<Route>` definition with appropriate path
4. Update navigation in `shared/components/layout/Sidebar.jsx`

### For New Role or Permission Level:
1. Create new role directory: `pages/{new-role}/`  
2. Create new route file: `routes/{new-role}/{NewRole}Routes.jsx`
3. Import and integrate in main `AppRoutes.jsx`
4. Update role checks in `AuthContext` and route guards
5. Update backend RBAC to match new role permissions

## 7. Testing Routes

The application includes route testing utilities:
- **Auth flow testing:** `?test=auth` URL parameter loads authentication flow testing
- **Route protection testing:** Verify role-based access controls
- **Navigation testing:** Test route transitions and state preservation

Route testing ensures both positive cases (authorized access) and negative cases (proper blocking of unauthorized access).
