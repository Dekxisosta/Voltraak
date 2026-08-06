# Frontend — Routing

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Overview.md`, `State-Management.md`, `../Backend/API.md` (§RBAC)

---

## 1. Route Table

Defined in `frontend/src/routes/AppRoutes.tsx`. Grouped by role, each group wrapped in a
`RoleRoute` element that gates the whole group:

| Path | Role(s) | Page |
|---|---|---|
| `/login` | Public | `LoginPage` |
| `/warehouse/receiving` | warehouse, manager | `ReceivingPage` |
| `/warehouse/picking` | warehouse, manager | `PickingPage` |
| `/warehouse/fefo` | warehouse, manager | `FEFOPage` |
| `/warehouse/discrepancies` | warehouse, manager | `DiscrepanciesPage` |
| `/inventory/stock-in-out` | inventory, manager | `StockInOutPage` |
| `/inventory/damage-report` | inventory, manager | `DamageReportPage` |
| `/inventory/item-update` | inventory, manager | `ItemUpdatePage` |
| `/inventory/stock-levels` | inventory, manager | `StockLevelsPage` |
| `/inventory/reservations` | inventory, manager | `ReservationsPage` |
| `/inventory/expiry-alerts` | inventory, manager | `ExpiryAlertsPage` |
| `/manager/kpi` | manager | `KPIDashboardPage` |
| `/manager/forecast` | manager | `ForecastReportsPage` |
| `/manager/reports` | manager | `InventoryReportsPage` |
| `/manager/low-stock` | manager | `LowStockAlertsPage` |
| `/manager/po-approvals` | manager | `POApprovalsPage` |
| `/` | any | Redirect — see §3 |

Manager is allowed on every warehouse/inventory route (mirrors the "Manager can access everything
Inventory/Warehouse can read" convention in `../Backend/API.md`).

## 2. Route Guard — `RoleRoute`

`frontend/src/routes/RoleRoute.tsx`:

- No `user` → redirect to `/login`.
- `user.role` not in `allowed` → redirect to `/`.
- Otherwise renders `<AppShell role={user.role}><Outlet /></AppShell>` — the shell (sidebar + nav)
  is applied once per route group, not per page.

**This is UX-only gating.** The comment in the source is explicit about this and it's worth
repeating here: the server enforces RBAC on every endpoint (`../Backend/API.md` §RBAC); this layer
only prevents an authenticated-but-wrong-role user from *seeing* a screen they couldn't act on
anyway. Never add a feature here as a substitute for a server-side check.

## 3. Root Redirect

`/` resolves based on auth + role:

| State | Destination |
|---|---|
| Not logged in | `/login` |
| `role === "warehouse"` | `/warehouse/picking` |
| `role === "inventory"` | `/inventory/stock-in-out` |
| `role === "manager"` | `/manager/kpi` |

This is each role's "landing" task — the one they'd start their shift on — not necessarily the
first item in their sidebar.

## 4. Adding a New Route

1. Add the page component under the right `pages/{role}/` folder.
2. Import it in `AppRoutes.tsx` and add a `<Route>` inside the matching `RoleRoute` group (or start
   a new group if it's a new role/permission shape).
3. Add the nav entry to `Sidebar.tsx`'s `NAV_BY_ROLE` (see `Components.md`) — a route with no nav
   entry is only reachable by typing the URL.
