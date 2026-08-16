<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Additional setup for IMS tests
        $this->withoutMiddleware([
            \App\Core\Middleware\StatusCodeMiddleware::class,
        ]);
    }

    /**
     * Create a user for testing.
     */
    protected function createTestUser(string $role = 'inventory'): \App\Modules\UserManagement\Models\User
    {
        return \App\Modules\UserManagement\Models\User::factory()->create([
            'role' => $role,
        ]);
    }

    /**
     * Assert that response has proper API structure.
     */
    protected function assertApiResponse($response, int $expectedStatus = 200): void
    {
        $response->assertStatus($expectedStatus);
        $response->assertJsonStructure([
            'success',
            'timestamp'
        ]);

        if ($expectedStatus >= 200 && $expectedStatus < 300) {
            $response->assertJson(['success' => true]);
            $response->assertJsonStructure(['data']);
        } else {
            $response->assertJson(['success' => false]);
            $response->assertJsonStructure([
                'error' => [
                    'code',
                    'message'
                ]
            ]);
        }
    }
}