# Database Schema Documentation

## Overview

The Voltraak Inventory Management System uses MySQL database with 15 tables organized into logical groups supporting the core business processes.

## Database Design Principles

- **Referential Integrity**: All foreign keys have proper constraints
- **Data Consistency**: Computed columns for calculated fields (variance, totals)
- **Audit Trail**: Created/updated timestamps on all tables
- **Indexing**: Strategic indexes for performance on query patterns
- **Enum Constraints**: Business rule enforcement at database level

## Tables Overview

### Core Entity Tables

1. **users** - System users with role-based access
2. **products** - Product catalog with inventory tracking
3. **suppliers** - Supplier information and payment terms
4. **batches** - Product batches with expiry tracking (FEFO support)

### Transaction Tables

5. **stock_transactions** - All inventory movements (audit trail)
6. **physical_counts** - Cycle count results and variance tracking
7. **customer_orders** - Customer order management
8. **reservations** - Stock reservation system
9. **purchase_orders** - Procurement workflow
10. **purchase_order_items** - PO line items
11. **procurement_requests** - Auto-generated reorder suggestions

### Reporting Tables

12. **damage_reports** - Damaged inventory tracking
13. **discrepancy_reports** - Issue tracking and investigation

### System Tables

14. **personal_access_tokens** - Laravel Sanctum authentication
15. **password_reset_tokens** - Password reset functionality

## Key Relationships

```
users (1) → (N) stock_transactions
users (1) → (N) physical_counts [counted_by]
users (1) → (N) purchase_orders [created_by, approved_by]

products (1) → (N) batches
products (1) → (N) stock_transactions
products (1) → (N) reservations

batches (1) → (N) stock_transactions [FEFO tracking]

suppliers (1) → (N) purchase_orders

customer_orders (1) → (N) reservations

purchase_orders (1) → (N) purchase_order_items
```

## Business Rules Enforced

### Stock Management
- **FEFO Compliance**: `stock_transactions.batch_id` enables First-Expired, First-Out
- **Variance Detection**: `physical_counts.variance` auto-calculated field
- **Batch Status**: Automatic status tracking (safe/warning/expired)

### Procurement Workflow
- **Approval Process**: PO status progression (draft → pending → approved → sent → received)
- **Lead Time Tracking**: Expected vs actual delivery dates
- **Cost Tracking**: Unit costs and total calculations

### Data Integrity
- **Unique Constraints**: SKU uniqueness, batch numbering per product
- **Referential Integrity**: Cascade deletes where appropriate
- **Computed Columns**: Auto-calculated fields for consistency

## Migration Order

Migrations are numbered to ensure proper foreign key dependency order:

1. `users` (base table)
2. `products` (independent)
3. `suppliers` (independent)
4. `batches` (depends on products)
5. `stock_transactions` (depends on products, batches, users)
6. `physical_counts` (depends on products, users)
7. `customer_orders` (depends on users)
8. `reservations` (depends on products, customer_orders, batches, users)
9. `purchase_orders` (depends on suppliers, users)
10. `purchase_order_items` (depends on purchase_orders, products)
11. `procurement_requests` (depends on products, users)
12. `damage_reports` (depends on products, batches, users)
13. `discrepancy_reports` (depends on products, batches, users)
14. `personal_access_tokens` (Laravel Sanctum)
15. `password_reset_tokens` (Laravel auth)

## Index Strategy

### Performance Indexes
- **Date ranges**: `transaction_date`, `count_date`, `order_date`
- **Status queries**: All status enums indexed
- **Foreign keys**: All FK columns indexed
- **Business queries**: Product + status combinations

### Composite Indexes
- `(product_id, transaction_date)` for inventory history
- `(product_id, status)` for active reservations
- `(supplier_id, status)` for PO management

## Data Seeding

### Production Seeds
- Default admin user
- Sample product categories
- Initial supplier data

### Development Seeds
- Test users with different roles
- Sample products with realistic data
- Batch data with various expiry states
- Historical transactions for testing

## Running Migrations

```bash
# Fresh installation
php artisan migrate:fresh --seed

# Run migrations only
php artisan migrate

# Run with seeding
php artisan migrate --seed

# Rollback and re-run
php artisan migrate:refresh --seed
```

## Database Maintenance

### Regular Tasks
- Monitor table sizes and performance
- Archive old transaction data (>2 years)
- Update expired batch statuses
- Clean up old password reset tokens

### Backup Strategy
- Daily full backups
- Transaction log backups every 15 minutes
- Monthly archive to long-term storage
- Test restore procedures quarterly

## Performance Considerations

### Query Optimization
- Use indexes for date range queries
- Avoid SELECT * in application code
- Use proper joins instead of N+1 queries
- Implement caching for frequently accessed data

### Storage Optimization
- Archive old transaction data
- Use appropriate data types (avoid VARCHAR for numbers)
- Regular index maintenance
- Monitor query execution plans

## Security

### Access Control
- Database user with minimal required privileges
- No direct database access for application users
- All queries through ORM (Eloquent)
- Parameterized queries to prevent injection

### Data Protection
- Sensitive fields (passwords) properly hashed
- Personal information access logging
- Regular security updates for database server
- Encrypted connections in production

## Testing

### Test Database
- Separate test database for PHPUnit
- In-memory SQLite for fast test execution
- Factory patterns for test data generation
- Database transactions for test isolation

### Data Validation
- Foreign key constraint testing
- Business rule validation testing
- Performance testing with realistic data volumes
- Migration testing (up and down scenarios)

## Troubleshooting

### Common Issues
- **Migration failures**: Check foreign key dependencies
- **Duplicate key errors**: Verify unique constraint requirements
- **Performance issues**: Check missing indexes
- **Data inconsistencies**: Review transaction boundaries

### Diagnostic Queries

```sql
-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.tables 
WHERE table_schema = 'voltraak_ims'
ORDER BY (data_length + index_length) DESC;

-- Find slow queries
SELECT * FROM mysql.slow_log 
ORDER BY start_time DESC 
LIMIT 10;

-- Check index usage
SHOW INDEX FROM stock_transactions;
```