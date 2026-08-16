# Database

## Inventory Management System (IMS) — WalangBrownout Appliances

**Engine:** MySQL
**Companion docs:** `../Architecture.md`, `../Backend/Project-Structure.md`, `../Backend/API.md`, `../Backend/Services.md`, `../../database/erd/`, `../../database/schema/schema.sql`

This doc, along with the ERD and schema DDL it points to, is grouped here under `Database/`
separately from `Backend/` — the data model is a shared dependency of the backend modules, not
something owned by any single one.

---

## 1. Tables

| Table | Key Fields |
|---|---|
| `users` | id, name, email, password_hash, role (ENUM), created_at |
| `products` | id, name, sku, category, unit_price, is_seasonal (TINYINT), shelf_life_days |
| `batches` | id, product_id (FK), batch_number, quantity, manufacture_date, expiry_date, status (ENUM: safe/warning/expired) |
| `stock_transactions` | id, product_id (FK), batch_id (FK), user_id (FK), type (ENUM: in/out/transfer/return), quantity, transaction_date |
| `physical_counts` | id, product_id (FK), counted_by (FK → users), counted_quantity, count_date, variance |
| `reservations` | id, product_id (FK), customer_order_id (FK), quantity, status (ENUM) |
| `customer_orders` | id, customer_name, order_date, status (ENUM) |
| `suppliers` | id, name, contact_info, address |
| `purchase_orders` | id, supplier_id (FK), approved_by (FK → users), status (ENUM), order_date, total_amount |
| `purchase_order_items` | id, purchase_order_id (FK), product_id (FK), quantity, unit_cost |
| `procurement_requests` | id, product_id (FK), threshold, current_stock, generated_at, status (ENUM) |

For exact column types/constraints, `../../database/schema/schema.sql` is the source of truth —
this table is a quick-reference summary, not a full DDL mirror.

## 2. Relationships

- `users` 1—N `stock_transactions`, `physical_counts` (as counter), `purchase_orders` (as approver)
- `products` 1—N `stock_transactions`, `batches`, `physical_counts`, `reservations`, `procurement_requests`, `purchase_order_items`
- `batches` 1—N `stock_transactions` (stock-out draws down a specific batch, enabling FEFO at the DB level)
- `customer_orders` 1—N `reservations`
- `suppliers` 1—N `purchase_orders`
- `purchase_orders` 1—N `purchase_order_items`

See `../../database/erd/ims-erd.md` for the visual ERD.

## 3. Design Notes

- `stock_transactions.batch_id` (not just `product_id`) is what makes FEFO enforceable at the data
  layer — stock-outs are routed to the batch with the nearest expiry rather than trusting shelf
  discipline. The selection logic itself lives in `FEFOService` (see `../Backend/Services.md`).
- `physical_counts.variance` directly implements the Inventory Variance formula (see
  `../Backend/Services.md` §Variance).
- `products.is_seasonal` + `shelf_life_days` let the Procurement Module branch its ROP calculation
  per item type (see `../Backend/Services.md` §ROP).

## 4. Migrations

Ordered migrations live in `backend/database/migrations/`, numbered to satisfy FK dependency order:

| Order | Migration | Table |
|---|---|---|
| 1 | `2024_01_01_000001_create_users_table.php` | `users` |
| 2 | `2024_01_01_000002_create_products_table.php` | `products` |
| 3 | `2024_01_01_000003_create_suppliers_table.php` | `suppliers` |
| 4 | `2024_01_01_000004_create_batches_table.php` | `batches` |
| 5 | `2024_01_01_000005_create_stock_transactions_table.php` | `stock_transactions` |
| 6 | `2024_01_01_000006_create_physical_counts_table.php` | `physical_counts` |
| 7 | `2024_01_01_000007_create_customer_orders_table.php` | `customer_orders` |
| 8 | `2024_01_01_000008_create_reservations_table.php` | `reservations` |
| 9 | `2024_01_01_000009_create_purchase_orders_table.php` | `purchase_orders` |
| 10 | `2024_01_01_000010_create_purchase_order_items_table.php` | `purchase_order_items` |
| 11 | `2024_01_01_000011_create_procurement_requests_table.php` | `procurement_requests` |

Corresponding Eloquent models live under each owning module's `Models/` folder (per
`../Backend/Project-Structure.md`), one per table — e.g. `Batch.php` and `StockTransaction.php`
live in `backend/app/Modules/Inventory/Models/`, `PurchaseOrder.php` in
`backend/app/Modules/Procurement/Models/`, `User.php` in
`backend/app/Modules/UserManagement/Models/`.
