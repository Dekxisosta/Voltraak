# Project Organization & Structure

## Repository Layout

```
Voltraak-1/
├── backend/           # Laravel API application
├── docs/             # Comprehensive project documentation
└── README.md         # Project overview and quick start
```

## Backend Module Organization

**Philosophy:** Modular Monolith - organized by business domain, not technical layers

### Four Core Modules

1. **Inventory Module** (`app/Modules/Inventory/`)
   - Stock in/out, batches, reservations, physical counts
   - FEFO enforcement, damage/discrepancy reports
   - Controllers: ProductController, BatchController, StockTransactionController, etc.

2. **Procurement Module** (`app/Modules/Procurement/`)
   - Demand forecasting, ROP calculation, supplier/PO management
   - Controllers: SupplierController, PurchaseOrderController, ReorderPointController

3. **Reporting Module** (`app/Modules/Reporting/`)
   - KPI aggregation, inventory reports, forecast summaries
   - Controllers: DashboardController, ReportController

4. **User Management Module** (`app/Modules/UserManagement/`)
   - Auth (JWT/session), role-based authorization
   - Controllers: AuthController, UserController

### Standard Module Structure
```
ModuleName/
├── Controllers/      # HTTP request handlers (thin layer)
├── Services/        # Business logic and rules
├── Repositories/    # Data access layer
├── Models/          # Eloquent models
├── Requests/        # Form validation
├── Resources/       # API response formatting
├── Policies/        # Authorization rules
├── DTOs/           # Data transfer objects
├── Routes/         # Module-specific routes
└── Tests/          # Feature and unit tests
```

## Documentation Structure

**Location:** `docs/` directory with comprehensive technical documentation

### Key Documentation Files
- **`PRD.md`** - Product requirements and success metrics
- **`Architecture.md`** - System overview and design decisions
- **`Backend/API.md`** - Complete REST API specification (55 endpoints)
- **`Backend/Services.md`** - Business logic formulas (ROP, FEFO, variance)
- **`Backend/Project-Structure.md`** - Detailed backend organization
- **`Database/Database.md`** - Schema, relationships, migrations
- **`Frontend/`** - Complete frontend documentation set
- **`QA/`** - Test plans, cases, and bug tracking

## Naming Conventions

### Backend
- **Controllers:** Singular noun + Controller (e.g., `ProductController`)
- **Services:** Domain + Service (e.g., `InventoryService`, `ReorderPointCalculator`)
- **Models:** Singular, PascalCase (e.g., `Product`, `StockTransaction`)
- **API Routes:** RESTful, plural resources (e.g., `/products`, `/stock-transactions`)

### Frontend
- **Components:** PascalCase (e.g., `StatusBadge`, `AppShell`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth`)
- **Pages:** Role-based organization in `pages/warehouse/`, `pages/inventory-staff/`, `pages/manager/`

## File Placement Rules

### Backend Code
- **Business logic:** Always in `Services/`, never in Controllers or Models
- **Database queries:** Isolated in `Repositories/`, not scattered in Services
- **Cross-module communication:** Through Service interfaces only
- **Shared utilities:** In `Support/` directory

### Frontend Code
- **API calls:** In `api/` directory, one file per backend module
- **Shared components:** In `components/common/` for cross-role use
- **Role-specific screens:** In appropriate `pages/{role}/` directory
- **Design tokens:** In `styles/tokens.ts`, mirrored to Tailwind config

## Development Workflow

### Branch Strategy
```
main (stable, PR-only) ← develop ← feature/<sprint>-<description>
                                 ← fix/<description>
```

### Testing Organization
- **Backend:** Tests in each module's `Tests/` directory
- **Unit tests:** Focus on Services and business logic
- **Feature tests:** API endpoint testing with role-based access
- **QA docs:** Comprehensive test cases organized by sprint and role