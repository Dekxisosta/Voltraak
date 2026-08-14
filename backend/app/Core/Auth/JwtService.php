<?php

namespace App\Core\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use App\Modules\UserManagement\Models\User;
use App\Core\Exceptions\ApiException;
use Carbon\Carbon;

/**
 * JWT Service for token generation and validation
 */
class JwtService
{
    private string $secret;
    private string $algorithm;
    private int $expiration;

    public function __construct()
    {
        $this->secret = config('app.key');
        $this->algorithm = config('jwt.algorithm', 'HS256');
        $this->expiration = config('jwt.expiration', 3600); // 1 hour default
    }

    /**
     * Generate JWT token for user
     */
    public function generateToken(User $user): string
    {
        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'iat' => Carbon::now()->timestamp,
            'exp' => Carbon::now()->addSeconds($this->expiration)->timestamp,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'name' => $user->name,
            ]
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Validate and decode JWT token
     */
    public function validateToken(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return (array) $decoded;
        } catch (ExpiredException $e) {
            throw new ApiException(401, 'TOKEN_EXPIRED', [], 'Token has expired');
        } catch (SignatureInvalidException $e) {
            throw new ApiException(401, 'INVALID_TOKEN', [], 'Invalid token signature');
        } catch (\Exception $e) {
            throw new ApiException(401, 'INVALID_TOKEN', [], 'Invalid token');
        }
    }

    /**
     * Extract user data from token
     */
    public function getUserFromToken(string $token): ?User
    {
        try {
            $payload = $this->validateToken($token);
            
            if (!isset($payload['user'])) {
                return null;
            }

            $userData = (array) $payload['user'];
            return User::find($userData['id']);
        } catch (ApiException $e) {
            return null;
        }
    }

    /**
     * Check if token is expired
     */
    public function isTokenExpired(string $token): bool
    {
        try {
            $payload = $this->validateToken($token);
            $exp = $payload['exp'] ?? 0;
            return Carbon::now()->timestamp >= $exp;
        } catch (ApiException $e) {
            return true;
        }
    }

    /**
     * Get token expiration time
     */
    public function getTokenExpiration(string $token): ?Carbon
    {
        try {
            $payload = $this->validateToken($token);
            $exp = $payload['exp'] ?? 0;
            return Carbon::createFromTimestamp($exp);
        } catch (ApiException $e) {
            return null;
        }
    }

    /**
     * Refresh token (generate new token with extended expiration)
     */
    public function refreshToken(string $token): string
    {
        $user = $this->getUserFromToken($token);
        
        if (!$user) {
            throw new ApiException(401, 'INVALID_TOKEN', [], 'Cannot refresh invalid token');
        }

        return $this->generateToken($user);
    }
}