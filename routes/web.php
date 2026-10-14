<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Modules\UserManagement\Services\AuthService;
use App\Modules\Reporting\Services\DashboardService;

/*
|--------------------------------------------------------------------------
| Root redirect
|--------------------------------------------------------------------------
*/

Route::get('/', fn () => redirect()->route('dashboard'));

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::get('/login', function () {
    return Inertia::render('auth/LoginPage');
})->name('login')->middleware('guest');

Route::post('/login', function (Request $request, AuthService $authService) {
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    try {
        $authService->login(
            $request->email,
            $request->password,
            $request->boolean('remember')
        );

        return redirect()->intended(route('dashboard'));
    } catch (\Exception $e) {
        return back()->withErrors(['email' => 'Invalid credentials']);
    }
})->name('login.submit')->middleware(['guest', 'throttle:login']);

Route::post('/logout', function (Request $request, AuthService $authService) {
    $authService->logout($request->user());
    return redirect()->route('login');
})->name('logout')->middleware('auth');

/*
|--------------------------------------------------------------------------
| Authenticated pages
| All routes below require a valid session (auth middleware).
| Inertia's HandleInertiaRequests middleware injects auth.user into every
| response so the React AuthContext always has the current user.
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {

    /*
    | Dashboard — role-aware rendering with lazy loading
    */
    Route::get('/dashboard', function (DashboardService $dashboardService) {
        $user = auth()->user();

        // Load dashboard data based on user role
        $dashboardData = match ($user->role->value) {
            'manager'        => $dashboardService->getManagerDashboard(),
            'inventory_staff'=> $dashboardService->getStaffDashboard(),
            'warehouse'      => $dashboardService->getStaffDashboard(),
            'admin'          => $dashboardService->getExecutiveDashboard(),
            default          => $dashboardService->getStaffDashboard(),
        };

        return Inertia::render('dashboard/DashboardPage', [
            'dashboard' => $dashboardData,
        ]);
    })->name('dashboard');

    /*
    | Section pages — each is a single Inertia page that uses ?tab= to
    | switch sub-views entirely on the client. The backend only needs to
    | serve the shell and any initial data required for the default tab.
    */

    // Warehouse staff
    Route::get('/warehouse', function () {
        return Inertia::render('warehouse/WarehouseSection');
    })->name('warehouse')->middleware('role:warehouse,admin');

    // Inventory staff
    Route::get('/inventory', function () {
        return Inertia::render('inventory/InventorySection');
    })->name('inventory')->middleware('role:inventory_staff,admin');

    // Manager
    Route::get('/manager', function (DashboardService $dashboardService) {
        return Inertia::render('manager/ManagerSection', [
            'kpiData' => $dashboardService->getManagerDashboard(),
        ]);
    })->name('manager')->middleware('role:manager,admin');

    // Admin
    Route::get('/admin', function () {
        return Inertia::render('admin/AdminSection');
    })->name('admin')->middleware('role:admin');

    // Notifications (all authenticated roles)
    Route::get('/notifications', function () {
        return Inertia::render('notifications/NotificationsPage');
    })->name('notifications');

});
