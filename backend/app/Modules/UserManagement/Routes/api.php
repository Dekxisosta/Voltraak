<?php

use Illuminate\Support\Facades\Route;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Modules\UserManagement\Controllers\UserController;

/*
|--------------------------------------------------------------------------
| User Management API Routes
|--------------------------------------------------------------------------
|
| Authentication and user management routes for the inventory system.
| These routes handle login, registration, user CRUD, and role management.
|
*/

/*
|--------------------------------------------------------------------------
| Authentication Routes (Public)
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->name('auth.')->group(function () {
    // Public authentication routes
    Route::post('login', [AuthController::class, 'login'])->name('login');
    Route::post('register', [AuthController::class, 'register'])->name('register');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->name('forgot-password');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->name('reset-password');
    
    // Protected authentication routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        Route::post('refresh', [AuthController::class, 'refresh'])->name('refresh');
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::get('check', [AuthController::class, 'check'])->name('check');
        Route::get('permissions', [AuthController::class, 'permissions'])->name('permissions');
        Route::post('change-password', [AuthController::class, 'changePassword'])->name('change-password');
        Route::post('verify-password', [AuthController::class, 'verifyPassword'])->name('verify-password');
    });
});

/*
|--------------------------------------------------------------------------
| User Management Routes (Protected)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->prefix('users')->name('users.')->group(function () {
    
    // User profile routes (self-service)
    Route::get('profile', [UserController::class, 'profile'])->name('profile');
    Route::put('profile', [UserController::class, 'updateProfile'])->name('update-profile');
    
    // User CRUD routes (admin/manager access)
    Route::get('/', [UserController::class, 'index'])->name('index');
    Route::post('/', [UserController::class, 'store'])->name('store');
    Route::get('{id}', [UserController::class, 'show'])->name('show');
    Route::put('{id}', [UserController::class, 'update'])->name('update');
    Route::delete('{id}', [UserController::class, 'destroy'])->name('destroy');
    
    // User status management
    Route::patch('{id}/toggle-status', [UserController::class, 'toggleStatus'])->name('toggle-status');
    Route::post('{id}/reset-password', [UserController::class, 'resetPassword'])->name('reset-password');
    
    // Bulk operations
    Route::post('bulk-update', [UserController::class, 'bulkUpdate'])->name('bulk-update');
    
    // Analytics and reports
    Route::get('statistics', [UserController::class, 'statistics'])->name('statistics');
    Route::get('requires-attention', [UserController::class, 'requiresAttention'])->name('requires-attention');
    Route::get('{id}/activity-report', [UserController::class, 'activityReport'])->name('activity-report');
});

/*
|--------------------------------------------------------------------------
| Role-based Route Groups
|--------------------------------------------------------------------------
*/

// Manager-only routes
Route::middleware(['auth:sanctum', 'role:manager'])->prefix('management')->name('management.')->group(function () {
    Route::get('user-overview', [UserController::class, 'statistics'])->name('user-overview');
    Route::get('attention-alerts', [UserController::class, 'requiresAttention'])->name('attention-alerts');
});

// Staff routes (warehouse + inventory staff + managers)
Route::middleware(['auth:sanctum', 'role:warehouse,inventory_staff,manager'])->prefix('staff')->name('staff.')->group(function () {
    Route::get('my-activity', [UserController::class, 'profile'])->name('my-activity');
});