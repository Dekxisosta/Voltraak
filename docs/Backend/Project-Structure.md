# Backend — Project Structure

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `../Architecture.md`, `API.md`, `Services.md`, `../Database/Database.md`

---

## 1. Overview

The backend follows a **Modular Monolith** architecture, per the design decision recorded here.

Instead of organizing files solely by technical type (`Controllers/`, `Models/`, `Services/` at the
app root), the codebase is organized by **business domain**. Each module contains everything
required for that feature, which keeps the four modules from `Architecture.md` §2 (Inventory,
Procurement, Reporting, User Management) physically separated in the codebase the same way they're
already separated conceptually — and matches the Extensibility NFR in `Architecture.md` §5: new
integrations (POS, supplier portal, mobile scanning) should be addable as new modules with minimal
impact on existing code, while the whole thing still deploys as a single Laravel application.

## 2. Top-Level Structure

```text
backend/app/
│
├── Core/
├── Modules/
├── Support/
├── Providers/
└── Console/
```

`backend/database/migrations/` stays at the framework-standard location (see
`../Database/Database.md` §4) — migrations are ordered globally by FK dependency across modules,
not owned by any single one.

---

## 3. Core

Application-wide functionality shared by every module.

```text
Core/
│
├── Auth/
├── Permissions/
├── Notifications/
├── Logging/
├── Exceptions/
├── Events/
├── Middleware/
└── Shared/
```

**Responsibilities:**

* Authentication (JWT/session issuing and validation)
* Authorization scaffolding shared across modules (role enum, base policy)
* Global middleware (e.g. role-gate enforcement referenced in `Architecture.md` §3)
* Notification system backing `GET /notifications` (`API.md` §12)
* Common exceptions and shared interfaces/helpers

Business logic should **not** be placed inside `Core` — a formula or rule that belongs to one
module (ROP, FEFO, variance) belongs in that module's `Services/`, not here.

## 4. Modules

Every business capability is implemented as its own module, matching the four modules already
defined in `Architecture.md` §2 and used throughout `API.md`:

```text
Modules/

Inventory/
Procurement/
Reporting/
UserManagement/
```

### Standard Module Layout

```text
Inventory/

Controllers/
Services/
Repositories/
Models/
Requests/
Resources/
Policies/
DTOs/
Routes/
Tests/
```

Each of the four modules follows this same layout. Applied to IMS:

| Layer | Inventory | Procurement | Reporting | UserManagement |
|---|---|---|---|---|
| **Controllers** | `ProductController`, `BatchController`, `StockTransactionController`, `PhysicalCountController`, `ReservationController` | `SupplierController`, `PurchaseOrderController`, `ReorderPointController` | `DashboardController`, `ReportController` | `AuthController`, `UserController` |
| **Services** | `InventoryService`, `StockMovementService`, `ReservationService`, `FEFOService`, `VarianceService` | `ReorderPointCalculator`, `ProcurementService` | `KPIAggregationService`, `ReportService` | `AuthService` |
| **Repositories** | `InventoryRepository`, `BatchRepository` | `SupplierRepository`, `PurchaseOrderRepository` | `ReportRepository` | `UserRepository` |
| **Models** | `Product`, `Batch`, `StockTransaction`, `PhysicalCount`, `Reservation`, `CustomerOrder` | `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `ProcurementRequest` | — (reads across modules via their Services) | `User` |
| **Policies** | `InventoryPolicy` | `SupplierPolicy`, `PurchaseOrderPolicy` | `ReportPolicy` | `UserPolicy` |

Full table/column detail for the Models column lives in `../Database/Database.md` §1; full
endpoint detail for the Controllers column lives in `API.md`; formulas backing the Services column
live in `Services.md`.

#### Controllers

Thin — receiving the HTTP request, delegating to a Service, returning the API response. No
business logic.

#### Services

Business rules — e.g. `App\Modules\Procurement\Services\ReorderPointCalculator` and
`App\Modules\Inventory\Services\FEFOService`, per `Services.md`.

#### Repositories

Isolate Eloquent queries from business logic — e.g. `InventoryRepository`, `SupplierRepository`.

#### Models

Eloquent models, one per table owned by that module (see `../Database/Database.md` §4 for the
migration → module mapping). Models describe relationships and attributes; complex rules stay in
Services.

#### Requests

Laravel Form Requests — validation and authorization, e.g. `StoreProductRequest`,
`StockAdjustmentRequest`.

#### Resources

API Resources formatting responses, e.g. `ProductResource`, `PurchaseOrderResource`.

#### Policies

Authorization rules, enforced server-side per the RBAC model in `Architecture.md` §3 and the RBAC
Summary in `API.md`.

#### DTOs

Structured data moved between layers, e.g. `CreateInventoryDTO`, `StockAdjustmentDTO`.

#### Routes

Each module owns its own `Routes/api.php`. The application's root `routes/api.php` loads each
module's routes under its base path (`/products`, `/batches`, `/suppliers`, `/dashboard`, ...).

#### Tests

Each module keeps its own `Feature/` and `Unit/` tests alongside its code.

## 5. Support

Reusable utilities not tied to a specific module.

```text
Support/

Helpers/
Traits/
Enums/
Constants/
Macros/
```

Examples relevant to IMS: the `batches.status` enum (`safe`/`warning`/`expired`) and
`stock_transactions.type` enum (`in`/`out`/`transfer`/`return`) from `../Database/Database.md` §1,
currency formatting for `unit_price`/`total_amount` fields, and date helpers used across the FEFO
and ROP calculations.

## 6. Providers

Laravel Service Providers — `AppServiceProvider`, `RouteServiceProvider` (the latter is what wires
each module's `Routes/api.php` into the app).

## 7. Console

Artisan commands and scheduled tasks.

```text
Console/

Commands/

Kernel.php
```

Relevant to IMS: a scheduled command sweeping `batches` for state transitions (feeding the Warning
alerts described in `Services.md` §3) and low-stock checks that seed `procurement_requests`.

## 8. Dependency Flow

```
HTTP Request
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Model
  ↓
Database
```

Responses return through:

```
Database → Model → Resource → Controller → HTTP Response
```

## 9. Module Communication

Modules communicate through Services, not by directly querying another module's models. For
example, the Reporting module's KPI aggregation reads Inventory data through Inventory's own
Service layer:

```
Reporting
  ↓
InventoryService
  ↓
Inventory Module
```

This is what keeps the Extensibility NFR (`Architecture.md` §5) real — a future module (e.g. a POS
integration) can be added without reworking Inventory/Procurement/Reporting/UserManagement
internals.

## 10. Why This Structure

Compared to a flat `Controllers/ Models/ Services/ Repositories/` layout, this keeps everything
for one module in one place — easier to onboard onto, easier to locate files in, fewer merge
conflicts between staff working on different modules at once, and it lets future modules (POS
integration, mobile scanning, supplier portal — see `Architecture.md` §5) be added without
restructuring what already exists.
