# QA — Test Cases

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Test-Plan.md`, `../Backend/API.md`, `../Backend/Services.md`,
`../Frontend/Pages.md`

Every row needs `Status`, `Owner`, and `Last Updated` filled in when touched — an empty or stale
row is treated as unverified (see `README.md` §Coverage Continuity), not as passing.

`Status` values: `Not Started` / `Pass` / `Fail` / `Blocked`.

---

## Sprint 1–3 — Foundation (Auth/RBAC, core inventory, supplier & PO base)

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| F-01 | Login issues valid JWT, `/auth/me` returns correct role | All | `/auth/login`, `/auth/me` | Not Started | | |
| F-02 | Warehouse Staff cannot access Manager-only endpoints (403, not just hidden UI) | Warehouse | `/reorder-points`, `/purchase-orders/{id}/approve` | Not Started | | |
| F-03 | Product CRUD respects role (Inventory can create/edit, only Manager can archive) | Inventory, Manager | `/products*` | Not Started | | |
| F-04 | Stock-in creates `batches` row + updates `products` stock + logs `stock_transactions` atomically (no partial write on failure) | Inventory | `/stock-in` | Not Started | | |
| F-05 | Supplier + PO creation, PO stays in draft until Manager approves | Manager | `/suppliers`, `/purchase-orders*` | Not Started | | |

## Sprint 4 — Shrinkage Prevention

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| S-01 | Physical count variance = recorded − physical, computed correctly on submit | Warehouse, Inventory | `/physical-counts` | Not Started | | |
| S-02 | Variance alert fires when shrinkage % exceeds 5% threshold, not below it | Manager | `/physical-counts`, `/discrepancy-reports` | Not Started | | |
| S-03 | Reservation locks stock — a reserved unit can't be double-sold via a separate stock-out | Inventory | `/reservations`, `/stock-out` | Not Started | | |
| S-04 | Every `stock_transactions`/`physical_counts` row carries a `user_id`/`counted_by` — no anonymous mutation reaches the DB | Warehouse, Inventory | `/stock-in`, `/stock-out`, `/physical-counts` | Not Started | | |
| **Metric check** | Inventory accuracy sample calc against the 26.67% → ≥98% target (`../PRD.md` §3) | — | — | Not Started | | |

## Sprint 5 — Expiry Management

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| E-01 | Batch state transitions Safe → Warning at exactly 60 days remaining | Warehouse | `/fefo-recommendations` | Not Started | | |
| E-02 | Expired batch is locked and excluded from `/fefo-recommendations` pick order | Warehouse | `/fefo-recommendations`, `/expiry-alerts` | Not Started | | |
| E-03 | Stock-out selects the batch with nearest expiry, not oldest-received (FEFO, not LIFO) | Inventory | `/stock-out` | Not Started | | |
| E-04 | Warning-state batch surfaces a clearance-promotion flag | Warehouse, Inventory | `/expiry-alerts` | Not Started | | |
| **Metric check** | Expiry write-offs trend toward near-zero once batches flag 60 days pre-expiry (`../PRD.md` §3) | — | — | Not Started | | |

## Sprint 6 — Demand Forecasting

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| D-01 | ROP calculation matches formula in `../Backend/Services.md` §1 for a non-seasonal product (`SF_m = 1`) | Manager | `/reorder-points` | Not Started | | |
| D-02 | ROP calculation branches correctly for a seasonal product (`is_seasonal = true`) | Manager | `/reorder-points` | Not Started | | |
| D-03 | `needsReplenishment()` triggers a `procurement_requests` row exactly when `current_stock < ROP` | Manager | `/reorder-points` | Not Started | | |
| D-04 | Safety stock and ROP never go negative even with edge-case inputs | Manager | `/reorder-points` | Not Started | | |

## Sprint 7 — Reporting

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| R-01 | KPI Dashboard stat cards match underlying data (Total SKUs, Stock Value, Low Stock Items, Shrinkage Rate) | Manager | `/dashboard/kpi` | Not Started | | |
| R-02 | Forecast Reports 8-week chart data matches ROP service output | Manager | `/reports/forecast` | Not Started | | |
| R-03 | Inventory Reports date-range filter and export produce matching data | Manager | `/reports/inventory`, `/reports/inventory/export` | Not Started | | |
| R-04 | Low Stock Alerts queue's inline "Reorder" action creates the expected procurement request | Manager | `/reorder-points` | Not Started | | |

## Cross-Cutting

| ID | Case | Role(s) | Endpoint(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| X-01 | Notifications feed is role-scoped (a Warehouse user doesn't see Manager-only alerts) | All | `/notifications` | Not Started | | |
| X-02 | Client-side route gating (`RoleRoute`) blocks the UI, but hitting the endpoint directly is still blocked server-side | All | any mutating endpoint | Not Started | | |
| X-03 | Status colors/badges never rely on color alone — label and icon both present (`../Frontend/Design-System.md` §2) | All | — | Not Started | | |

## Sprint 8 — Hardening (Regression)

Full regression pass across all rows above, plus:

| ID | Case | Role(s) | Status | Owner | Last Updated |
|---|---|---|---|---|---|
| H-01 | End-to-end: receive → stock-in → reserve → FEFO pick → stock-out → physical count → variance alert | All | Not Started | | |
| H-02 | End-to-end: low stock → ROP alert → procurement request → PO creation → Manager approval → receive (closes the loop) | Inventory, Manager | Not Started | | |
