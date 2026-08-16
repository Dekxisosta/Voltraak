<?php

namespace Tests\Unit\Core\Auth;

use Tests\TestCase;
use App\Core\Auth\JwtService;
use App\Models\User;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtServiceTest extends TestCase
{
    use RefreshDatabase;

    private JwtService $jwtService;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->jwtService = app(JwtService::class);
        
        $this->user = User::factory()->create([
            'role' => UserRole::MANAGER,
        ]);
    }

    /**
     * Test JWT token generation.
     */
    public function test_can_generate_jwt_token(): void
    {
        $token = $this->jwtService->generateToken($this->user);

        $this->assertIsString($token);
        $this->assertNotEmpty($token);
        
        // Verify token structure (header.payload.signature)
        $parts = explode('.', $token);
        $this->assertCount(3, $parts);
    }

    /**
     * Test JWT token validation.
     */
    public function test_can_validate_jwt_token(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        
        $isValid = $this->jwtService->validateToken($token);
        
        $this->assertTrue($isValid);
    }

    /**
     * Test invalid JWT token validation.
     */
    public function test_validates_invalid_token(): void
    {
        $invalidToken = 'invalid.jwt.token';
        
        $isValid = $this->jwtService->validateToken($invalidToken);
        
        $this->assertFalse($isValid);
    }

    /**
     * Test JWT token payload extraction.
     */
    public function test_can_extract_token_payload(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        
        $payload = $this->jwtService->getTokenPayload($token);
        
        $this->assertIsArray($payload);
        $this->assertEquals($this->user->id, $payload['sub']);
        $this->assertEquals($this->user->email, $payload['email']);
        $this->assertEquals($this->user->role->value, $payload['role']);
        $this->assertArrayHasKey('iat', $payload);
        $this->assertArrayHasKey('exp', $payload);
    }

    /**
     * Test token payload includes correct user data.
     */
    public function test_token_payload_includes_user_data(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        $payload = $this->jwtService->getTokenPayload($token);

        $this->assertEquals($this->user->id, $payload['sub']);
        $this->assertEquals($this->user->name, $payload['name']);
        $this->assertEquals($this->user->email, $payload['email']);
        $this->assertEquals($this->user->role->value, $payload['role']);
        $this->assertEquals(config('app.name'), $payload['iss']);
    }

    /**
     * Test token expiration.
     */
    public function test_token_has_expiration(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        $payload = $this->jwtService->getTokenPayload($token);

        $this->assertArrayHasKey('exp', $payload);
        
        $expirationTime = $payload['exp'];
        $expectedExpiration = time() + (config('jwt.ttl') * 60);
        
        // Allow 5 second variance
        $this->assertEqualsWithDelta($expectedExpiration, $expirationTime, 5);
    }

    /**
     * Test token refresh.
     */
    public function test_can_refresh_token(): void
    {
        $originalToken = $this->jwtService->generateToken($this->user);
        
        sleep(1); // Ensure different timestamps
        
        $refreshedToken = $this->jwtService->refreshToken($originalToken);
        
        $this->assertIsString($refreshedToken);
        $this->assertNotEquals($originalToken, $refreshedToken);
        
        // Both tokens should be valid
        $this->assertTrue($this->jwtService->validateToken($originalToken));
        $this->assertTrue($this->jwtService->validateToken($refreshedToken));
        
        // New token should have later expiration
        $originalPayload = $this->jwtService->getTokenPayload($originalToken);
        $refreshedPayload = $this->jwtService->getTokenPayload($refreshedToken);
        
        $this->assertGreaterThan($originalPayload['exp'], $refreshedPayload['exp']);
    }

    /**
     * Test cannot refresh invalid token.
     */
    public function test_cannot_refresh_invalid_token(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        
        $this->jwtService->refreshToken('invalid.token');
    }

    /**
     * Test token expiry detection.
     */
    public function test_can_detect_expired_token(): void
    {
        // Create token with very short expiration
        $payload = [
            'sub' => $this->user->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'role' => $this->user->role->value,
            'iat' => time() - 10,
            'exp' => time() - 5, // Expired 5 seconds ago
            'iss' => config('app.name'),
        ];

        $expiredToken = JWT::encode($payload, config('jwt.secret'), 'HS256');
        
        $isValid = $this->jwtService->validateToken($expiredToken);
        
        $this->assertFalse($isValid);
    }

    /**
     * Test token user ID extraction.
     */
    public function test_can_extract_user_id_from_token(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        
        $userId = $this->jwtService->getUserIdFromToken($token);
        
        $this->assertEquals($this->user->id, $userId);
    }

    /**
     * Test token with different user roles.
     */
    public function test_tokens_work_with_different_roles(): void
    {
        $roles = [UserRole::WAREHOUSE, UserRole::INVENTORY_STAFF, UserRole::MANAGER];
        
        foreach ($roles as $role) {
            $user = User::factory()->create(['role' => $role]);
            $token = $this->jwtService->generateToken($user);
            $payload = $this->jwtService->getTokenPayload($token);
            
            $this->assertEquals($role->value, $payload['role']);
            $this->assertTrue($this->jwtService->validateToken($token));
        }
    }

    /**
     * Test token signature verification.
     */
    public function test_token_signature_verification(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        
        // Tamper with the token
        $parts = explode('.', $token);
        $parts[2] = 'tampered_signature';
        $tamperedToken = implode('.', $parts);
        
        $isValid = $this->jwtService->validateToken($tamperedToken);
        
        $this->assertFalse($isValid);
    }

    /**
     * Test token blacklisting functionality.
     */
    public function test_can_blacklist_token(): void
    {
        $token = $this->jwtService->generateToken($this->user);
        
        // Initially valid
        $this->assertTrue($this->jwtService->validateToken($token));
        
        // Blacklist the token
        $this->jwtService->blacklistToken($token);
        
        // Should now be invalid
        $this->assertFalse($this->jwtService->validateToken($token));
    }

    /**
     * Test batch token validation for performance.
     */
    public function test_batch_token_validation(): void
    {
        $tokens = [];
        
        // Generate multiple tokens
        for ($i = 0; $i < 10; $i++) {
            $user = User::factory()->create();
            $tokens[] = $this->jwtService->generateToken($user);
        }
        
        // Validate all tokens
        $results = $this->jwtService->validateTokens($tokens);
        
        $this->assertIsArray($results);
        $this->assertCount(10, $results);
        
        foreach ($results as $result) {
            $this->assertTrue($result);
        }
    }
}