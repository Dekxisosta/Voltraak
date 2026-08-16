# Voltraak Inventory Management System - Backend

Laravel API backend for the WalangBrownout Appliances Inventory Management System.

## Architecture

**Pattern:** Modular Monolith  
**Framework:** Laravel 10  
**Database:** MySQL  
**Authentication:** Laravel Sanctum (JWT)

### Modules

- **UserManagement:** Authentication, authorization, user management
- **Inventory:** Products, batches, stock transactions, FEFO enforcement
- **Procurement:** Suppliers, purchase orders, reorder point calculations
- **Reporting:** KPIs, dashboards, inventory reports

## Setup

### Requirements

- PHP 8.1+
- Composer
- MySQL 8.0+
- Node.js (for asset compilation, optional)

### Installation

1. **Install dependencies:**
   ```bash
   composer install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Database configuration:**
   Update `.env` with your database credentials:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=voltraak_ims
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

4. **Run migrations:**
   ```bash
   php artisan migrate
   ```

5. **Seed database (optional):**
   ```bash
   php artisan db:seed
   ```

### Development

**Start development server:**
```bash
php artisan serve
```

**Run tests:**
```bash
php artisan test
```

**Check code style:**
```bash
./vendor/bin/pint
```

## API Documentation

- **Base URL:** `http://localhost:8000/api/v1`
- **Authentication:** Bearer token (JWT)
- **Documentation:** See `docs/Backend/API.md`

### Key Endpoints

- `POST /auth/login` - User authentication
- `GET /products` - List products
- `POST /stock-in` - Record stock receipt
- `POST /stock-out` - Record stock issue (FEFO enforced)
- `GET /dashboard/kpi` - Manager dashboard KPIs

## Configuration

### IMS-Specific Settings

Configuration lives in `config/ims.php`:

- **Variance Threshold:** Default 5% for physical count alerts
- **Expiry Warning:** 60 days before expiry warning
- **FEFO Enforcement:** Enabled by default
- **Pagination:** 15 items per page default

### Environment Variables

Key IMS environment variables:

```env
IMS_DEFAULT_VARIANCE_THRESHOLD=5
IMS_EXPIRY_WARNING_DAYS=60
IMS_FEFO_ENFORCEMENT=true
IMS_DEFAULT_PAGINATION_SIZE=15
```

## Business Logic

### Core Features

1. **FEFO Enforcement:** First-Expired, First-Out picking mandatory
2. **Variance Detection:** Automated alerts when physical counts exceed threshold
3. **Reorder Points:** Automated calculation with seasonal adjustments
4. **Role-Based Access:** Warehouse/Inventory/Manager permission levels

### Key Formulas

**Reorder Point Calculation:**
```
ROP = (Seasonal_Demand × Lead_Time) + Safety_Stock
```

**Inventory Accuracy:**
```
Accuracy = (Physical_Stock / Recorded_Stock) × 100%
```

**Shrinkage Rate:**
```
Shrinkage = (Missing_Units / Recorded_Stock) × 100%
```

## Testing

### Test Structure

- `tests/Unit/` - Unit tests for services and business logic
- `tests/Feature/` - Integration tests for API endpoints
- `tests/Unit/Core/` - Tests for shared Core functionality

### Running Tests

```bash
# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run with coverage
php artisan test --coverage
```

## Logging

### Log Channels

- `api` - API request/response logging
- `inventory` - Inventory transaction logging
- `procurement` - Procurement workflow logging

### Log Files

- `storage/logs/laravel.log` - General application logs
- `storage/logs/api.log` - API-specific logs
- `storage/logs/inventory.log` - Inventory operations
- `storage/logs/procurement.log` - Procurement operations

## Security

### Authentication

- Laravel Sanctum for API authentication
- JWT tokens with configurable expiration
- Role-based authorization gates

### Data Protection

- Sensitive fields masked in logs
- Password hashing with bcrypt
- CSRF protection for web routes
- Rate limiting on API endpoints

## Performance

### Optimization Features

- Database query optimization with proper indexing
- Eager loading for relationships
- Response caching for reports
- Pagination for large datasets

### Monitoring

- Status code logging for all API responses
- Performance metrics in logs
- Database query logging in development

## Deployment

### Production Checklist

- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Configure production database
- [ ] Set up proper logging
- [ ] Configure cache driver (Redis recommended)
- [ ] Set up queue driver for background jobs
- [ ] Configure CORS for frontend domain
- [ ] Set up SSL certificate
- [ ] Configure backup strategy

### Environment Configuration

Production environment variables:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

LOG_CHANNEL=daily
LOG_LEVEL=warning
```

## Contributing

### Code Style

- Follow PSR-12 coding standards
- Use Laravel Pint for code formatting
- Write comprehensive tests for new features
- Document business logic changes

### Development Workflow

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run test suite and code style checks
4. Submit pull request to `develop`
5. Code review and merge

### Module Development

When adding new modules:
1. Create module directory under `app/Modules/`
2. Follow standard module structure (Controllers, Services, Repositories, Models, etc.)
3. Add module routes to `RouteServiceProvider`
4. Create corresponding tests
5. Update API documentation