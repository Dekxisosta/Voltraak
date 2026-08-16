<?php

namespace App\Modules\UserManagement\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\UserManagement\Services\AuthService;
use App\Modules\UserManagement\Requests\LoginRequest;
use App\Modules\UserManagement\Requests\RegisterRequest;
use App\Modules\UserManagement\Requests\ChangePasswordRequest;
use App\Modules\UserManagement\Requests\ResetPasswordRequest;
use App\Modules\UserManagement\Requests\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends BaseController
{
    public function __construct(
        private AuthService $authService
    ) {}

    /**
     * Login user.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->validated('email'),
                $request->validated('password')
            );

            return $this->successResponse($result, 'Login successful');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 401);
        }
    }

    /**
     * Register new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->register($request->validated());
            
            return $this->successResponse($result, 'Registration successful', 201);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Logout user.
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user());
            
            return $this->successResponse([], 'Logout successful');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Refresh JWT token.
     */
    public function refresh(Request $request): JsonResponse
    {
        try {
            $token = $request->bearerToken();
            
            if (!$token) {
                return $this->errorResponse('Token not provided', 401);
            }

            $result = $this->authService->refresh($token);
            
            return $this->successResponse($result, 'Token refreshed successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 401);
        }
    }

    /**
     * Get current user profile.
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $profile = $this->authService->getUserProfile($request->user());
            
            return $this->successResponse($profile);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Send password reset link.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->sendPasswordResetLink(
                $request->validated('email')
            );
            
            return $this->successResponse($result);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->resetPassword($request->validated());
            
            return $this->successResponse($result, 'Password reset successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Change user password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->changePassword(
                $request->user(),
                $request->validated('current_password'),
                $request->validated('new_password')
            );
            
            return $this->successResponse($result, 'Password changed successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Verify current password.
     */
    public function verifyPassword(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|string']);
        
        try {
            $isValid = $this->authService->verifyPassword(
                $request->user(),
                $request->input('password')
            );
            
            return $this->successResponse([
                'valid' => $isValid
            ], $isValid ? 'Password verified' : 'Invalid password');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Check authentication status.
     */
    public function check(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return $this->errorResponse('Not authenticated', 401);
        }

        return $this->successResponse([
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'is_active' => $user->is_active
            ]
        ]);
    }

    /**
     * Get user permissions.
     */
    public function permissions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $permissionService = app(\App\Core\Permissions\PermissionService::class);
            
            $permissions = $permissionService->getUserPermissions($user);
            
            return $this->successResponse([
                'permissions' => $permissions,
                'role' => $user->role->value
            ]);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}