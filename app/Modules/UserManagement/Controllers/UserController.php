<?php

namespace App\Modules\UserManagement\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\UserManagement\Services\UserService;
use App\Modules\UserManagement\Resources\UserResource;
use App\Modules\UserManagement\Requests\StoreUserRequest;
use App\Modules\UserManagement\Requests\UpdateUserRequest;
use App\Modules\UserManagement\Requests\BulkUpdateUsersRequest;
use App\Modules\UserManagement\Requests\ResetUserPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseController
{
    public function __construct(
        private UserService $userService
    ) {}

    /**
     * Get all users with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'role', 'is_active', 'department', 'search',
                'sort_by', 'sort_direction'
            ]);
            
            $perPage = $request->integer('per_page', 15);
            
            $users = $this->userService->getUsers($filters, $perPage);
            
            return $this->paginatedResponse($users, UserResource::class);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Create a new user.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->createUser($request->validated());
            
            return $this->successResponse(
                new UserResource($user),
                'User created successfully',
                201
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get a specific user.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = $this->userService->getUserById($id);
            
            return $this->successResponse(new UserResource($user));
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    /**
     * Update a user.
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        try {
            $user = $this->userService->updateUser($id, $request->validated());
            
            return $this->successResponse(
                new UserResource($user),
                'User updated successfully'
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Toggle user active status.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        try {
            $user = $this->userService->toggleUserStatus($id);
            
            return $this->successResponse(
                new UserResource($user),
                'User status updated successfully'
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Delete a user.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->userService->deleteUser($id);
            
            return $this->successResponse([], 'User deleted successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get user statistics.
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = $this->userService->getUserStatistics();
            
            return $this->successResponse($stats);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Get users requiring attention.
     */
    public function requiresAttention(): JsonResponse
    {
        try {
            $users = $this->userService->getUsersRequiringAttention();
            
            return $this->successResponse([
                'users' => UserResource::collection($users),
                'count' => $users->count()
            ]);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Reset user password (admin function).
     */
    public function resetPassword(ResetUserPasswordRequest $request, int $id): JsonResponse
    {
        try {
            $user = $this->userService->resetUserPassword(
                $id,
                $request->validated('new_password')
            );
            
            return $this->successResponse(
                new UserResource($user),
                'Password reset successfully'
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Bulk update users.
     */
    public function bulkUpdate(BulkUpdateUsersRequest $request): JsonResponse
    {
        try {
            $results = $this->userService->bulkUpdateUsers(
                $request->validated('user_ids'),
                $request->validated('updates')
            );
            
            return $this->successResponse([
                'results' => $results,
                'summary' => [
                    'total' => count($results),
                    'successful' => count(array_filter($results, fn($r) => $r['success'])),
                    'failed' => count(array_filter($results, fn($r) => !$r['success']))
                ]
            ], 'Bulk update completed');
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get user activity report.
     */
    public function activityReport(Request $request, int $id): JsonResponse
    {
        try {
            $days = $request->integer('days', 30);
            $report = $this->userService->getUserActivityReport($id, $days);
            
            return $this->successResponse($report);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    /**
     * Get current user's profile.
     */
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            return $this->successResponse([
                'user' => new UserResource($user),
                'activity_summary' => $user->getRecentActivitySummary(),
                'performance_metrics' => $user->getPerformanceMetrics(),
                'attention_items' => $user->needsAttention()
            ]);
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Update current user's profile.
     */
    public function updateProfile(UpdateUserRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->updateUser(
                $request->user()->id,
                $request->validated()
            );
            
            return $this->successResponse(
                new UserResource($user),
                'Profile updated successfully'
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}