<?php

namespace App\Modules\UserManagement\Services;

use App\Models\User;
use App\Core\Auth\JwtService;
use App\Core\Logging\ActivityLogger;
use App\Core\Exceptions\ValidationException;
use App\Support\Enums\UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(
        private JwtService $jwtService,
        private ActivityLogger $activityLogger
    ) {}

    /**
     * Authenticate user and return JWT token.
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            $this->activityLogger->logActivity(
                null,
                'auth.login.failed',
                'Failed login attempt',
                ['email' => $email, 'ip' => request()->ip()]
            );
            
            throw new ValidationException('Invalid credentials');
        }

        if (!$user->is_active) {
            $this->activityLogger->logActivity(
                $user->id,
                'auth.login.blocked',
                'Login blocked - account inactive',
                ['email' => $email]
            );
            
            throw new ValidationException('Account is inactive');
        }

        // Update last login
        $user->updateLastLogin();

        // Generate JWT token
        $token = $this->jwtService->generateToken($user);
        
        // Generate API token for Sanctum
        $apiToken = $user->generateApiToken('auth-session');

        $this->activityLogger->logActivity(
            $user->id,
            'auth.login.success',
            'User logged in successfully',
            ['ip' => request()->ip(), 'user_agent' => request()->userAgent()]
        );

        return [
            'user' => $this->formatUserData($user),
            'token' => $token,
            'api_token' => $apiToken,
            'expires_in' => config('jwt.ttl') * 60, // Convert minutes to seconds
        ];
    }

    /**
     * Logout user and revoke tokens.
     */
    public function logout(User $user): void
    {
        // Revoke all API tokens
        $user->revokeAllTokens();

        $this->activityLogger->logActivity(
            $user->id,
            'auth.logout',
            'User logged out',
            ['ip' => request()->ip()]
        );
    }

    /**
     * Register a new user.
     */
    public function register(array $userData): array
    {
        // Validate role assignment permissions
        $currentUser = Auth::user();
        if ($currentUser && !$this->canAssignRole($currentUser, $userData['role'])) {
            throw new ValidationException('You do not have permission to assign this role');
        }

        $user = User::create([
            'name' => $userData['name'],
            'email' => $userData['email'],
            'password' => $userData['password'], // Will be hashed by User model cast
            'role' => UserRole::from($userData['role']),
            'phone' => $userData['phone'] ?? null,
            'department' => $userData['department'] ?? null,
            'is_active' => $userData['is_active'] ?? true,
        ]);

        $this->activityLogger->logActivity(
            $currentUser?->id,
            'user.created',
            'New user registered',
            [
                'created_user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role->value
            ]
        );

        // If registering themselves, log them in
        if (!$currentUser) {
            return $this->login($user->email, $userData['password']);
        }

        return [
            'user' => $this->formatUserData($user),
            'message' => 'User created successfully'
        ];
    }

    /**
     * Refresh JWT token.
     */
    public function refresh(string $token): array
    {
        try {
            $newToken = $this->jwtService->refresh($token);
            $user = $this->jwtService->getUser($newToken);

            return [
                'token' => $newToken,
                'user' => $this->formatUserData($user),
                'expires_in' => config('jwt.ttl') * 60,
            ];
        } catch (\Exception $e) {
            throw new ValidationException('Invalid or expired token');
        }
    }

    /**
     * Send password reset link.
     */
    public function sendPasswordResetLink(string $email): array
    {
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            // Don't reveal if email exists or not for security
            return ['message' => 'If the email exists, a password reset link has been sent'];
        }

        $status = Password::sendResetLink(['email' => $email]);

        if ($status === Password::RESET_LINK_SENT) {
            $this->activityLogger->logActivity(
                $user->id,
                'auth.password_reset.requested',
                'Password reset requested',
                ['email' => $email, 'ip' => request()->ip()]
            );

            return ['message' => 'Password reset link sent successfully'];
        }

        throw new ValidationException('Unable to send password reset link');
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(array $credentials): array
    {
        $status = Password::reset(
            $credentials,
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));

                $this->activityLogger->logActivity(
                    $user->id,
                    'auth.password_reset.completed',
                    'Password reset successfully',
                    ['email' => $user->email, 'ip' => request()->ip()]
                );
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ['message' => 'Password reset successfully'];
        }

        throw new ValidationException('Invalid or expired password reset token');
    }

    /**
     * Change user password.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): array
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new ValidationException('Current password is incorrect');
        }

        $user->update(['password' => $newPassword]);

        // Revoke all existing tokens to force re-authentication
        $user->revokeAllTokens();

        $this->activityLogger->logActivity(
            $user->id,
            'auth.password_changed',
            'Password changed successfully',
            ['ip' => request()->ip()]
        );

        return ['message' => 'Password changed successfully'];
    }

    /**
     * Verify user's current password.
     */
    public function verifyPassword(User $user, string $password): bool
    {
        return Hash::check($password, $user->password);
    }

    /**
     * Get user profile with permissions.
     */
    public function getUserProfile(User $user): array
    {
        return [
            'user' => $this->formatUserData($user),
            'permissions' => $this->getUserPermissions($user),
            'activity_summary' => $user->getRecentActivitySummary(),
            'performance_metrics' => $user->getPerformanceMetrics(),
        ];
    }

    /**
     * Check if user can assign a specific role.
     */
    private function canAssignRole(User $user, string $role): bool
    {
        $targetRole = UserRole::from($role);
        
        // Only managers can assign roles
        if (!$user->isManager()) {
            return false;
        }

        // Managers can assign any role except their own level
        return $targetRole !== UserRole::MANAGER;
    }

    /**
     * Get user permissions based on role.
     */
    private function getUserPermissions(User $user): array
    {
        $permissionService = app(\App\Core\Permissions\PermissionService::class);
        
        return $permissionService->getUserPermissions($user);
    }

    /**
     * Format user data for API response.
     */
    private function formatUserData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_display' => $user->role_display,
            'phone' => $user->phone,
            'department' => $user->department,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString(),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'created_at' => $user->created_at->toISOString(),
            'display_name' => $user->display_name,
            'initials' => $user->initials,
        ];
    }
}