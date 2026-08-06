# Architecture

## Inventory Management System (IMS) — WalangBrownout Appliances

**Status:** Draft
**Companion docs:** `PRD.md`, `Backend/Project-Structure.md`, `Backend/API.md`, `Database/Database.md`, `Backend/Services.md`

---

## 1. System Overview

Modular monolith, three independently deployable containers:

| Container | Stack | Responsibility |
|---|---|---|
| Frontend | React SPA (TypeScript, Vite) | All UI: dashboards, transaction forms, reports, procurement screens |
| Backend | Laravel (PHP), MVC + Controller-Service-Repository | REST API + business logic, split into 4 modules |
| Database | MySQL | Inventory, transactions, batches, purchase orders, users |

"Modular monolith" means one deployable backend, but internally partitioned into modules with
clear boundaries — new integrations (POS, supplier portal, mobile scanning) should be addable as
new modules/services without reworking the boundaries below (see §5, Extensibility).

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

Three roles: **Warehouse Staff**, **Inventory Staff**, **Manager**. Access is role-scoped —
enforced server-side in the User Management Module on every mutating endpoint. Client-side route
gating exists for UX only and is never a substitute for server enforcement (see
`Frontend/Routing.md` and `Backend/API.md` §RBAC).

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
| Data integrity | Every stock movement must be transactional (DB transaction wrapping quantity update + log insert) — no partial writes |
| Auditability | Every `stock_transactions` and `physical_counts` row must carry `user_id`/`counted_by` — no anonymous mutations |
| Latency | Stock level reads (dashboards, stock-out validation) should reflect writes within the same request cycle — no eventual-consistency lag acceptable for oversell prevention |
| Availability | Core stock-in/stock-out/reservation flows are business-critical; target uptime should match warehouse operating hours at minimum |
| Extensibility | New integrations (POS, supplier portal, mobile scanning) must be addable as new modules/services without modifying existing Inventory/Procurement/Reporting/User Management boundaries |
| Security | Passwords hashed (never plaintext), JWT/session expiry enforced, role checks server-side on every mutating endpoint |

## 6. Diagrams

C4 Context/Container/Component/Code diagrams are the source of truth for the visual architecture
and live in the Software Architecture Document. This folder previously reserved an
`architecture/` directory for exported copies of those diagrams — currently empty in this
checkout; add exports there and link them here when available.

## 7. Open Questions

- Confirm supplier lead time (`L`, used in the ROP formula — see `Backend/Services.md`) is stored
  per supplier-product pair or per supplier only.
- Confirm barcode/QR payload format (product SKU only, or SKU + batch number) to fully automate
  receiving-to-batch creation.
