<?php

namespace App\Core\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Support\Enums\UserRole;
use Inertia\Inertia;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Authentication required'], 401);
            }
            return redirect()->route('login');
        }

        $hasRequiredRole = collect($roles)->contains(
            fn ($role) => $this->userHasRole($user, $role)
        );

        if (!$hasRequiredRole) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Insufficient permissions.',
                    'required_roles' => $roles,
                    'user_role' => $user->role->value,
                ], 403);
            }

            // For Inertia web requests, redirect to dashboard with error
            return redirect()->route('dashboard')->with(
                'error', 'You do not have permission to access that page.'
            );
        }

        return $next($request);
    }

    private function userHasRole($user, string $role): bool
    {
        $userRole = $user->role;

        // Admin always has access everywhere
        if ($userRole === UserRole::ADMIN) return true;

        return match ($role) {
            'warehouse'       => $userRole === UserRole::WAREHOUSE,
            'inventory_staff' => $userRole === UserRole::INVENTORY_STAFF,
            'manager'         => $userRole === UserRole::MANAGER,
            'admin'           => $userRole === UserRole::ADMIN,
            default           => $userRole->value === $role,
        };
    }
}
