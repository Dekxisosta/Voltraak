# Technology Stack & Build System

## Architecture

**Pattern:** Modular Monolith  
**Deployment:** Single deployable Laravel backend + React SPA frontend
**Hosting:** Docker Compose (development) or traditional hosting (production)

## Backend Stack

- **Framework:** Laravel (PHP)
- **Database:** MySQL
- **Authentication:** JWT/Session tokens
- **Architecture:** MVC + Controller-Service-Repository pattern
- **Testing:** PHPUnit

### Backend Structure
```
app/
├── Core/          # Shared auth, permissions, exceptions, middleware
├── Modules/       # Business domains (Inventory, Procurement, Reporting, UserManagement)
├── Support/       # Utilities, enums, constants
├── Providers/     # Service providers
└── Console/       # Artisan commands
```

## Frontend Stack

- **Framework:** React 18 with JavaScript
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React hooks (useAuth pattern)

### Frontend Structure
```
src/
├── api/           # API clients per backend module
├── components/    # Shared components (common/ + layout/)
├── features/      # Feature-scoped screens
├── hooks/         # Cross-cutting React hooks
├── pages/         # Role-scoped screens by user role
├── routes/        # Route definitions and guards
└── styles/        # Tailwind config + design tokens
```

## Common Commands

### Backend Development
```bash
# Install dependencies
composer install

# Run migrations
php artisan migrate

# Run tests
php artisan test

# Start development server
php artisan serve
```

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Environment Configuration

- **Backend:** `.env` file with database, JWT, and app configuration
- **Frontend:** `.env` with `VITE_API_BASE_URL` (defaults to `http://localhost:8000/api`)

## Module Communication Rules

- Modules communicate through Services, never direct model access
- Each module owns its routes, controllers, services, repositories
- Cross-module dependencies go through service layer interfaces
- Database migrations are global but logically grouped by module ownership