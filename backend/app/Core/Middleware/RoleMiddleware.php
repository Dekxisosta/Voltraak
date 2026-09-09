<?php

namespace App\Core\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Support\Enums\UserRole;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
                'error_code' => 'UNAUTHENTICATED'
            ], 401);
        }

        // Check if user has any of the required roles
        $hasRequiredRole = false;
        
        foreach ($roles as $role) {
            if ($this->userHasRole($user, $role)) {
                $hasRequiredRole = true;
                break;
            }
        }

        if (!$hasRequiredRole) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient permissions. Required roles: ' . implode(', ', $roles),
                'error_code' => 'INSUFFICIENT_PERMISSIONS',
                'data' => [
                    'user_role' => $user->role->value,
                    'required_roles' => $roles
                ]
            ], 403);
        }

        return $next($request);
    }

    /**
     * Check if user has the specified role.
     */
    private function userHasRole($user, string $role): bool
    {
        $userRole = $user->role;
        
        // Handle role hierarchy - higher roles inherit lower role permissions
        return match($role) {
            'warehouse' => in_array($userRole, [
                UserRole::WAREHOUSE, 
                UserRole::INVENTORY_STAFF, 
                UserRole::MANAGER
            ]),
            'inventory_staff' => in_array($userRole, [
                UserRole::INVENTORY_STAFF, 
                UserRole::MANAGER
            ]),
            'manager' => $userRole === UserRole::MANAGER,
            default => $userRole->value === $role
        };
    }
}