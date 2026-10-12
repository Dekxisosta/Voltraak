<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Modules\UserManagement\Services\AuthService;
use App\Modules\Reporting\Services\DashboardService;

Route::get('/', fn () => redirect()->route('dashboard'));

Route::get('/login', function () {
    return Inertia::render('auth/Login');
})->name('login')->middleware('guest');

Route::post('/login', function (Request $request, AuthService $authService) {
    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    try {
        $result = $authService->login(
            $request->email,
            $request->password,
            $request->boolean('remember')
        );

        return redirect()->route('dashboard');
    } catch (\Exception $e) {
        return back()->withErrors(['email' => 'Invalid credentials']);
    }
});

Route::post('/logout', function (AuthService $authService) {
    $authService->logout();
    return redirect()->route('login');
})->name('logout');

Route::get('/dashboard', function (DashboardService $dashboardService) {
    $user = auth()->user();
    
    $dashboardData = match($user->role->value) {
        'manager' => $dashboardService->getManagerDashboard(),
        'inventory_staff' => $dashboardService->getStaffDashboard(),
        'warehouse' => $dashboardService->getStaffDashboard(),
        default => $dashboardService->getStaffDashboard(),
    };

    return Inertia::render('dashboard/Manager', [
        'user' => $user,
        'dashboard' => $dashboardData,
    ]);
})->name('dashboard')->middleware('auth:sanctum');
