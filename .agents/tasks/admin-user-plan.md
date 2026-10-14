# Implementation Plan: Admin User Management Frontend/Backend Fixes

This plan addresses all identified mismatches between the frontend User Management page and the backend API for the admin section of the Voltraak Inventory Management System.

## Background

The admin User Management page (`resources/js/pages/admin/users/UserManagementPage.jsx`) currently performs only optimistic local-state updates without calling backend APIs. Multiple response shape and field name mismatches prevent proper integration with the Laravel backend.

---

## Implementation Steps

- [ ] 1. **Wire frontend mutation handlers to call backend API endpoints**
      
      **What:** Modify `handleSubmitForm`, `handleToggleActive`, and `handleConfirmDelete` in `UserManagementPage.jsx` to call the real API methods instead of only updating local state.
      
      **Files:**
      - `resources/js/pages/admin/users/UserManagementPage.jsx`
      
      **Changes:**
      - In `handleSubmitForm`: Call `await usersApi.createUser(form)` when `editingUser` is null, or `await usersApi.updateUser(editingUser.id, form)` when editing. Update state from the response data or reload via `loadUsers()`.
      - In `handleToggleActive`: Call `await usersApi.toggleUserStatus(user.id)`, then update local state from the returned user data.
      - In `handleConfirmDelete`: Call `await usersApi.deleteUser(deleteTarget.id)`, then remove the user from local state on success.
      - Add try-catch error handling for each API call. Display error notifications via `addNotification` and revert optimistic updates if any were applied.
      
      **Why:** Currently all mutations are purely optimistic — they never hit the API. This means no data persists to the database, and refreshing the page loses all changes.
      
      **Verify:** 
      ```bash
      docker compose up -d
      # Set VITE_DATA_SOURCE=api in .env
      # Open http://localhost:5173/admin?tab=users
      # Open browser DevTools Network tab
      # Create a user → confirm POST /api/v1/users is sent
      # Edit a user → confirm PUT /api/v1/users/{id} is sent
      # Toggle status → confirm PATCH /api/v1/users/{id}/toggle-status is sent
      # Delete a user → confirm DELETE /api/v1/users/{id} is sent
      # Reload the page and confirm changes persist
      ```

- [ ] 2. **Fix response shape mismatch between backend and frontend**
      
      **What:** The backend `UserController::index()` returns `paginatedResponse()` which wraps data in `{ success, data: { items: [...], pagination: {...} }, message, timestamp }`. The frontend treats the whole response as the array. Extract the correct nested path.
      
      **Files:**
      - `resources/js/shared/api/client.js` (read to understand unwrapping behavior)
      - `resources/js/pages/admin/users/UserManagementPage.jsx`
      - `resources/js/shared/mocks/manager/users.js`
      
      **Changes:**
      - Check if `apiClient.get()` in `client.js` has response interceptors that unwrap the `{ success, data, message }` envelope. If it returns only `data`, then the frontend needs `result.items`. If it returns the full envelope, the frontend needs `result.data.items`.
      - Update `loadUsers()` in `UserManagementPage.jsx` to extract `result.data.items` (or `result.items` if apiClient unwraps) instead of treating `result` as the array directly: `setData({ users: result.data.items, loading: false })` (adjust based on actual apiClient behavior).
      - Optionally extract and store `result.data.pagination` for future pagination UI.
      - Update `mockUsers` in `resources/js/shared/mocks/manager/users.js` to return the same shape as the API after client unwrapping, so mock and API modes behave identically. If apiClient returns `data` directly, `mockUsers` should be an object `{ items: [...], pagination: {...} }` or just the array if that's what the real unwrapped response is.
      
      **Why:** The current code does `setData({ users: result, loading: false })` which treats the entire response object as the user array, causing the table to fail to render or show incorrect data.
      
      **Verify:**
      ```bash
      # With VITE_DATA_SOURCE=api
      npm run dev
      # Open http://localhost:5173/admin?tab=users
      # Confirm the user table displays correctly with real API data
      # Open DevTools console and confirm no errors about undefined data
      
      # With VITE_DATA_SOURCE=mocks
      # Confirm the user table displays correctly with mock data
      ```

- [ ] 3. **Add password field to the Add User form**
      
      **What:** `StoreUserRequest` requires a `password` field (min 8 chars, uppercase, lowercase, digit, special char), but the Add User form has no password input. Add a password field to the form.
      
      **Files:**
      - `resources/js/pages/admin/users/UserManagementPage.jsx`
      
      **Changes:**
      - Add `password: ''` to `emptyForm` initial state.
      - In the Add/Edit modal form JSX, add an `<Input>` component with `type="password"`, `label="Password"`, `required={!editingUser}`, visible only when adding (not editing: `!editingUser`), and bound to `form.password`.
      - In `validateForm()`, add client-side validation for password when adding: min 8 chars, at least one uppercase, one lowercase, one digit, one special char. Set `formErrors.password` if invalid.
      - When editing a user, do not show the password field and do not send `password` in the update payload (password changes are separate per `UpdateUserRequest` logic).
      
      **Why:** Without a password field, creating a user always fails with a 422 validation error because the backend requires `password`.
      
      **Verify:**
      ```bash
      # Open the Add User modal
      # Confirm a Password field is visible
      # Try to create a user without a password → confirm validation prevents submission
      # Try to create a user with a weak password (e.g., 'test') → confirm validation fails
      # Create a user with a strong password (e.g., 'Password123!') → confirm user is created (201 response)
      # Open the Edit User modal → confirm no Password field is shown
      ```

- [ ] 4. **Fix field name mismatch: last_login vs last_login_at**
      
      **What:** `UserResource` returns `last_login_at` but the frontend reads `u.last_login`. Update the frontend to use `last_login_at`.
      
      **Files:**
      - `resources/js/pages/admin/users/UserManagementPage.jsx`
      - `resources/js/shared/mocks/manager/users.js`
      
      **Changes:**
      - In `UserManagementPage.jsx`, find the `columns` definition for the `last_login` key.
      - Change the column key from `'last_login'` to `'last_login_at'`.
      - Ensure the render function reads `last_login_at`: `(val) => (val ? new Date(val).toLocaleString() : 'Never')`.
      - Update `mockUsers` in `resources/js/shared/mocks/manager/users.js`: rename `last_login` to `last_login_at` in all mock user objects.
      
      **Why:** The backend API returns `last_login_at` (Laravel timestamp naming convention), but the frontend expects `last_login`, causing the Last Login column to always show "Never".
      
      **Verify:**
      ```bash
      # With VITE_DATA_SOURCE=api
      # Open http://localhost:5173/admin?tab=users
      # Confirm Last Login column shows timestamps or 'Never' correctly
      
      # With VITE_DATA_SOURCE=mocks
      # Confirm Last Login column shows timestamps correctly
      
      # Inspect a user object in DevTools Network response → confirm field is 'last_login_at'
      ```

- [ ] 5. **Add admin role RBAC to user CRUD routes**
      
      **What:** User CRUD routes currently use only `auth:sanctum` middleware. The task specifies admin-only access. Add `role:admin` middleware to user CRUD routes and update authorization logic in request classes and service.
      
      **Files:**
      - `app/Modules/UserManagement/Routes/api.php`
      - `app/Modules/UserManagement/Requests/StoreUserRequest.php`
      - `app/Modules/UserManagement/Requests/UpdateUserRequest.php`
      - `app/Models/User.php`
      - `app/Modules/UserManagement/Services/UserService.php`
      
      **Changes:**
      - In `api.php`, wrap the user CRUD routes (index, store, show, update, destroy, toggleStatus) in a `role:admin` middleware group. Keep the profile routes (GET/PUT `/profile`) under `auth:sanctum` only (no role restriction).
      - In `StoreUserRequest.php`, change `authorize()` from `return $this->user() && $this->user()->isManager();` to `return $this->user() && $this->user()->isAdmin();`.
      - Add an `isAdmin()` helper method to `app/Models/User.php` if it does not exist:
        ```php
        public function isAdmin(): bool
        {
            return $this->role === \App\Support\Enums\UserRole::ADMIN;
        }
        ```
      - In `UpdateUserRequest.php`, change the manager check in `authorize()` from `$user->isManager()` to `($user->id == $targetUserId || $user->isAdmin())`.
      - In `UserService.php`, update `canManageUser()` and `canUpdateUser()` to check `isAdmin()` instead of `isManager()` where appropriate, so service-layer authorization aligns with route middleware.
      
      **Why:** The task specifies "admin-related" access. Currently managers can create users via `StoreUserRequest::authorize()`, but the routes have no role middleware, allowing any authenticated user to attempt CRUD operations. `RoleMiddleware` already supports the `admin` role and treats `ADMIN` as having access everywhere.
      
      **Verify:**
      ```bash
      # Log in as an admin user
      # Open http://localhost:5173/admin?tab=users
      # Confirm the page loads and all CRUD operations work
      
      # Log in as a manager user
      # Navigate to /admin?tab=users
      # Confirm a 403 Forbidden response or redirect with error message
      
      # Manually test via curl or Postman:
      # GET /api/v1/users with a manager token → expect 403
      # GET /api/v1/users with an admin token → expect 200
      
      # Run backend tests (if they exist):
      docker compose exec app php artisan test --filter=User
      ```

---

## Summary

This plan fixes the following issues:

1. **Frontend mutations never hit the API** → Wire handlers to call `usersApi` methods
2. **Response shape mismatch** → Extract `result.data.items` (or `result.items`) instead of treating `result` as the array
3. **Missing password field** → Add password input to Add User form with client-side validation
4. **Field name mismatch** → Change `last_login` to `last_login_at` in frontend and mocks
5. **No RBAC on user CRUD** → Add `role:admin` middleware to routes and update authorization checks

All changes preserve existing business logic, RBAC patterns, and the modular architecture. The plan is ordered by dependency: Step 1 and 2 can be done in parallel or sequentially; Step 3-5 are independent of each other but should all be completed before final integration testing.
