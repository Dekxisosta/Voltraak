<?php

namespace App\Modules\UserManagement\Services;

use App\Models\User;
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
        private ActivityLogger $activityLogger
    ) {}

    /**
     * Authenticate the user and establish a Laravel session (Sanctum SPA mode).
     *
     * No token is generated or returned here - authentication state is
     * carried by the session cookie going forward, with CSRF protection
     * handled via Sanctum's stateful middleware.
     */
    public function login(string $email, string $password, bool $remember = false): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            $this->activityLogger->logActivity(
                'auth.login.failed',
                'auth',
                null,
                ['email' => $email, 'ip' => request()->ip()]
            );

            throw new ValidationException([], 'Invalid credentials');
        }

        if (!$user->is_active) {
            $this->activityLogger->logActivity(
                'auth.login.blocked',
                'auth',
                $user,
                ['email' => $email]
            );

            throw new ValidationException([], 'Account is inactive');
        }

        // Update last login
        $user->updateLastLogin();

        // Establish the session for the "web" guard and rotate the session
        // ID to guard against session fixation on login.
        Auth::guard('web')->login($user, $remember);
        request()->session()->regenerate();

        $this->activityLogger->logActivity(
            'auth.login.success',
            'auth',
            $user,
            ['ip' => request()->ip(), 'user_agent' => request()->userAgent()]
        );

        return [
            'user' => $this->formatUserData($user),
        ];
    }

    /**
     * Log the user out, invalidate the session and rotate the CSRF token.
     */
    public function logout(User $user): void
    {
        $this->activityLogger->logActivity(
            'auth.logout',
            'auth',
            $user,
            ['ip' => request()->ip()]
        );

        Auth::guard('web')->logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }

    /**
     * Register a new user.
     */
    public function register(array $userData): array
    {
        // Registration is manager-only (defence in depth - RegisterRequest and
        // the route middleware already enforce this). There is no public
        // self-signup path, so never create an account without an actor.
        $currentUser = Auth::user() ?? request()->user('sanctum');
        if (!$currentUser || !$this->canAssignRole($currentUser, $userData['role'])) {
            throw new ValidationException([], 'You do not have permission to assign this role');
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
            'user.created',
            'user',
            $currentUser,
            [
                'created_user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role->value
            ]
        );

        return [
            'user' => $this->formatUserData($user),
            'message' => 'User created successfully'
        ];
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
                'auth.password_reset.requested',
                'auth',
                $user,
                ['email' => $email, 'ip' => request()->ip()]
            );

            return ['message' => 'Password reset link sent successfully'];
        }

        throw new ValidationException([], 'Unable to send password reset link');
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

                // AuthenticateSession compares the session's stored password
                // hash to the user's, so changing it ends every old session.
                $user->revokeAllTokens();

                event(new PasswordReset($user));

                $this->activityLogger->logActivity(
                    'auth.password_reset.completed',
                    'auth',
                    $user,
                    ['email' => $user->email, 'ip' => request()->ip()]
                );
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ['message' => 'Password reset successfully'];
        }

        throw new ValidationException([], 'Invalid or expired password reset token');
    }

    /**
     * Change user password.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): array
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new ValidationException([], 'Current password is incorrect');
        }

        $user->update(['password' => $newPassword]);

        // Kill every other session / API token for this account. Rehashes the
        // password hash stored in the current session so this one survives.
        $user->revokeAllTokens();
        if (Auth::guard('web')->check() && Auth::guard('web')->id() === $user->id) {
            Auth::guard('web')->logoutOtherDevices($newPassword);
        }

        $this->activityLogger->logActivity(
            'auth.password_changed',
            'auth',
            $user,
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

        return $permissionService->getUserPermissions($user->role);
    }

    /**
     * Format user data for API response / Inertia shared props.
     */
    public function formatUserData(User $user): array
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
