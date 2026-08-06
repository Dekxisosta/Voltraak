# Backend — API

## Inventory Management System (IMS) — WalangBrownout Appliances

**Base URL:** `/api/v1`
**Auth:** Bearer token (JWT) on every endpoint except `/auth/login`
**Companion docs:** `../PRD.md`, `../Architecture.md`, `Project-Structure.md`, `../Database/Database.md`, `Services.md`

Conventions:
- All list endpoints support `?page=&per_page=` pagination.
- All mutating endpoints (`POST`/`PATCH`/`DELETE`) return the updated resource.
- Roles shown are the *minimum* role required; Manager can access everything Inventory/Warehouse can read.

---

## 1. Auth & Users — `User Management Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | Public | Authenticate, return JWT + user + role |
| POST | `/auth/logout` | Any | Invalidate session/token |
| GET | `/auth/me` | Any | Return current user profile + role |
| GET | `/users` | Manager | List all users |
| POST | `/users` | Manager | Create a user (staff onboarding) |
| PATCH | `/users/{id}` | Manager | Update role/status |
| DELETE | `/users/{id}` | Manager | Deactivate a user |

---

## 2. Products — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/products` | Any | List/search products (filters: category, is_seasonal, low_stock) |
| GET | `/products/{id}` | Any | Product detail incl. current stock, active batches |
| POST | `/products` | Inventory | Create a new product/SKU |
| PATCH | `/products/{id}` | Inventory | Edit description, category, unit_price, reorder settings, storage bin |
| DELETE | `/products/{id}` | Manager | Archive a discontinued product |
| GET | `/products/{id}/stock-levels` | Any | Current quantity, location, status badge (in-stock/low/critical) |

---

## 3. Batches & Expiry — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/batches` | Any | List batches (filters: product_id, status) |
| POST | `/batches` | Inventory/Warehouse | Create a batch on receipt (manufacture_date, expiry_date, quantity) |
| GET | `/batches/{id}` | Any | Batch detail |
| PATCH | `/batches/{id}` | Inventory | Correct batch data (rare — audit-logged) |
| GET | `/expiry-alerts` | Any | Batches in Warning/Expired state, sorted by t_remaining ascending |
| GET | `/fefo-recommendations` | Warehouse | Pick order for a product/route, oldest expiry first |

---

## 4. Stock Transactions — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/stock-in` | Inventory/Warehouse | Record receipt: creates/updates batch, updates product stock, logs transaction |
| POST | `/stock-out` | Inventory/Warehouse | FEFO-select batch, deduct qty, log transaction |
| POST | `/stock-transfer` | Inventory | Move stock between storage locations (no quantity change) |
| GET | `/stock-transactions` | Any | Transaction ledger (filters: product_id, batch_id, user_id, type, date range) |
| GET | `/stock-transactions/{id}` | Any | Single transaction detail (audit trail) |

---

## 5. Physical Counts & Discrepancies — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/physical-counts` | Warehouse | Submit a cycle count (product_id, counted_quantity) → server computes variance |
| GET | `/physical-counts` | Any | List counts (filters: product_id, date range, variance_exceeds_threshold) |
| GET | `/physical-counts/{id}` | Any | Count detail incl. variance, accuracy%, shrinkage% |
| POST | `/discrepancy-reports` | Warehouse | Log a mismatch found during receiving/picking (expected vs actual qty, type, notes) |
| GET | `/discrepancy-reports` | Any | List discrepancies (filters: status open/resolved) |
| PATCH | `/discrepancy-reports/{id}` | Inventory/Manager | Mark resolved, add investigation notes |

---

## 6. Damage Reports — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/damage-reports` | Inventory | Log damaged/written-off stock (product_id, qty, damage_type, photo, notes) |
| GET | `/damage-reports` | Any | List damage reports |

---

## 7. Reservations & Customer Orders — `Inventory Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/customer-orders` | Inventory | Create a customer order shell |
| GET | `/customer-orders/{id}` | Any | Order detail incl. line-item reservations |
| POST | `/reservations` | Inventory | Reserve stock against a customer_order_id (prevents overselling) |
| GET | `/reservations` | Any | List reservations (filters: status pending/confirmed, product_id) |
| PATCH | `/reservations/{id}` | Inventory | Confirm or release a reservation |

---

## 8. Suppliers — `Procurement Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/suppliers` | Manager | List suppliers |
| POST | `/suppliers` | Manager | Add a supplier |
| PATCH | `/suppliers/{id}` | Manager | Edit contact info/address |
| DELETE | `/suppliers/{id}` | Manager | Deactivate a supplier |

---

## 9. Reorder Points & Procurement Requests — `Procurement Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/reorder-points` | Manager | Compute ROP per product, return low-stock list, auto-generate procurement_requests |
| GET | `/procurement-requests` | Manager | List generated replenishment requests (filters: status) |
| PATCH | `/procurement-requests/{id}` | Manager | Approve → convert to PO, or dismiss |

---

## 10. Purchase Orders — `Procurement Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/purchase-orders` | Manager | Create a PO (supplier_id, line items) |
| GET | `/purchase-orders` | Manager | List POs (filters: status pending/approved/fulfilled) |
| GET | `/purchase-orders/{id}` | Manager | PO detail incl. line items |
| PATCH | `/purchase-orders/{id}/approve` | Manager | Approve — sets approved_by, status |
| PATCH | `/purchase-orders/{id}/reject` | Manager | Reject with reason |
| POST | `/purchase-orders/{id}/receive` | Warehouse | Mark fulfillment — triggers `/stock-in` for each line item |

---

## 11. Reporting & Dashboard — `Reporting Module`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/dashboard/kpi` | Manager | Total SKUs, stock value, low-stock count, shrinkage rate |
| GET | `/reports/inventory` | Manager | Date-ranged inventory report (item, category, movement, value) — exportable |
| GET | `/reports/inventory/export` | Manager | CSV/PDF export of the above |
| GET | `/reports/forecast` | Manager | 8-week demand forecast per product + seasonal trend + suggested reorder qty |
| GET | `/reports/procurement` | Manager | Procurement summary (open POs, spend by supplier) |

---

## 12. Cross-Cutting

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/notifications` | Any | Role-scoped alert feed (low stock, expiry warnings, variance alerts, PO status) |
| PATCH | `/notifications/{id}/read` | Any | Mark alert as read |
| GET | `/health` | Public | Uptime/health check |

---

## RBAC Summary

| Role | Allowed Endpoints (subset) |
|---|---|
| Warehouse Staff | Receiving List, Picking List, FEFO Recommendations, Discrepancy Report (`/physical-counts`, receiving/picking reads) |
| Inventory Staff | `/stock-in`, `/stock-out`, `/expiry-alerts`, `/reservations`, item updates, damage reports |
| Manager | `/dashboard/kpi`, `/reports/*`, `/reorder-points`, `/purchase-orders/{id}/approve` |

Enforced server-side in the User Management Module — never trust client-side role gating alone
(see `Frontend/Routing.md`).

---

## Endpoint Count by Module

| Module | Endpoint Count |
|---|---|
| User Management | 7 |
| Inventory (products, batches, transactions, counts, damage, reservations) | 27 |
| Procurement (suppliers, ROP, requests, POs) | 13 |
| Reporting | 5 |
| Cross-cutting | 3 |
| **Total** | **55** |

## Build Order (maps to Sprint plan)

| Sprint | Endpoints to ship |
|---|---|
| 1 | `/auth/*`, `/users` |
| 2 | `/products`, `/batches`, `/stock-in`, `/stock-out`, `/stock-transactions` |
| 3 | `/suppliers`, `/purchase-orders*` (creation + approval, no receive yet) |
| 4 | `/physical-counts`, `/discrepancy-reports`, `/reservations`, `/customer-orders` |
| 5 | `/expiry-alerts`, `/fefo-recommendations`, `/damage-reports` |
| 6 | `/reorder-points`, `/procurement-requests` |
| 7 | `/dashboard/kpi`, `/reports/*`, `/notifications` |
| 8 | `/purchase-orders/{id}/receive` (closes the PO→stock-in loop), hardening/bug fixes |
