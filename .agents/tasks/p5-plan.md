# Implementation Plan - P5 Cleanup Tasks (T36-T40)

Based on exploration of the Voltraak IMS Laravel + React codebase, this plan addresses five critical cleanup tasks for production readiness and consistency.

## Project Context

- **Tech Stack**: Laravel 11 + React 18 SPA with Inertia.js, MySQL database
- **Build Commands**: `composer install`, `npm install`, `npm run build`
- **Test Commands**: `vendor/bin/phpunit` (PHPUnit), `npm run test` (Vitest)
- **Verification**: Each task includes specific test commands to confirm success
- **Role Hierarchy**: WAREHOUSE < INVENTORY_STAFF < MANAGER < ADMIN (admin sits outside hierarchy with all permissions)

---

## Implementation Tasks

- [ ] 1. **Fix admin role exclusion from user management (T36 - PERMISSION CONSISTENCY)**
      
      **Problem**: The `isManager()` method only checks for MANAGER role, excluding ADMIN from user management operations. The UserRole enum shows ADMIN exists, and RoleMiddleware properly handles admin access, but permission methods don't.
      
      **Files**: 
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Models\User.php`
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\UserManagement\Policies\UserPolicy.php`
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Core\Permissions\PermissionService.php`
      
      **Changes**:
      - In `User.php`: Update `isManager()` method to return `return in_array($this->role, [UserRole::MANAGER, UserRole::ADMIN]);`
      - Verify `PermissionService.php` already handles ADMIN correctly (it does - returns all permissions for ADMIN)
      - No changes needed to UserPolicy as it uses `isManager()` method
      
      **Verify**: `vendor/bin/phpunit tests/Unit/Core/Permissions/PermissionServiceTest.php --filter="admin"` - admin permission tests pass

---

- [ ] 2. **Fix email uniqueness to exclude soft-deleted users (T37 - DATA INTEGRITY)**
      
      **Problem**: Email validation rules use `unique:users,email` which includes soft-deleted users, preventing recreation of accounts with previously deleted email addresses.
      
      **Files**:
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\UserManagement\Requests\StoreUserRequest.php`
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\UserManagement\Requests\UpdateUserRequest.php`
      
      **Changes**:
      - In `StoreUserRequest.php`: Change `'unique:users,email'` to `Rule::unique('users', 'email')->withoutTrashed()`
      - In `UpdateUserRequest.php`: Change `Rule::unique('users', 'email')->ignore($userId)` to `Rule::unique('users', 'email')->ignore($userId)->withoutTrashed()`
      
      **Verify**: `vendor/bin/phpunit tests/Feature/UserManagement/` - user creation and update tests with soft-deleted emails pass

---

- [ ] 3. **Remove dead code from frontend (T38 - TECHNICAL DEBT)**
      
      **Problem**: Based on exploration, identified potentially unused legacy components and routing files.
      
      **Analysis**:
      - `resources/js/App.jsx`: **ACTIVE** - Main app component imported by entry point
      - `resources/js/routes/AppRoutes.jsx`: **ACTIVE** - Main routing component imported by App.jsx
      - `resources/js/shared/components/common/SessionManager.jsx`: **ACTIVE** - Session management component used throughout app
      
      **Files to investigate further**:
      - Search for any actual dead code by checking imports across the codebase
      - Check for placeholder API endpoints in routes files
      
      **Changes**:
      - Grep search for unused imports and components
      - Remove any truly unused files (none found in initial exploration)
      - Check routes files for stub endpoints marked as TODO or placeholder
      
      **Verify**: `npm run build` - frontend builds successfully without missing imports

---

- [ ] 4. **Update physical counts variance precision (T39 - DATA MODEL)**
      
      **Problem**: The `variance_percentage` column is `decimal(5,2)` which overflows at 999.99%, insufficient for large variances.
      
      **Files**:
      - Create new migration: `database/migrations/YYYY_MM_DD_HHMMSS_update_physical_counts_variance_precision.php`
      
      **Changes**:
      - Create migration to change `variance_percentage` from `decimal(5,2)` to `decimal(8,2)`
      - Also update `accuracy_percentage` and `threshold_used` to `decimal(8,2)` for consistency
      - **IMPORTANT**: Create new migration, do NOT modify existing `2024_01_01_000006_create_physical_counts_table.php`
      
      **Verify**: `php artisan migrate:status` - new migration shows as run, `php artisan tinker` - test variance calculations with values >999%

---

- [ ] 5. **Prepare deployment configuration (T40 - DEPLOYMENT)**
      
      **Problem**: Production deployment files and settings need cleanup for security and proper exclusion of development artifacts.
      
      **Files**:
      - `c:\Users\nelxe\Downloads\voltraak-mock\.gitignore`
      - `c:\Users\nelxe\Downloads\voltraak-mock\.env.example`
      - `c:\Users\nelxe\Downloads\voltraak-mock\config\app.php`
      
      **Changes**:
      - Verify `.gitignore` excludes `/public/build` and `/public/hot` (✓ already present)
      - Verify `.gitignore` excludes `.env` files (✓ already present)  
      - Add production deployment note to `.env.example`: Add comment `# IMPORTANT: Set APP_DEBUG=false in production environments`
      - Verify `config/app.php` uses `env('APP_DEBUG', false)` (✓ already correct)
      
      **Verify**: `git status` shows no tracked build artifacts, `.env.example` contains production guidance

---

## Verification Summary

After completing all tasks:

1. **Test Backend**: `vendor/bin/phpunit` - all tests pass
2. **Test Frontend**: `npm run test` - all tests pass  
3. **Build Frontend**: `npm run build` - builds without errors
4. **Check Migrations**: `php artisan migrate:status` - all migrations successful
5. **Verify Security**: Confirm no sensitive files tracked, proper debug settings

## Notes

- All file paths are absolute to avoid workspace confusion
- Tasks can be executed independently but T39 (migration) should be run before final testing
- User.php role hierarchy fix (T36) is the most critical for admin functionality
- Frontend dead code analysis (T38) may find minimal removable code - focus on actual unused files only