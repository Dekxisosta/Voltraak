<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    /**
     * Test the health check endpoint returns success.
     */
    public function test_health_check_returns_success(): void
    {
        $response = $this->get('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'status',
                    'version',
                    'timestamp',
                ],
                'timestamp',
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'healthy',
                    'version' => '1.0.0',
                ],
            ]);
    }

    /**
     * Test health check includes proper timestamp format.
     */
    public function test_health_check_includes_timestamp(): void
    {
        $response = $this->get('/api/health');
        
        $data = $response->json();
        
        $this->assertArrayHasKey('timestamp', $data);
        $this->assertArrayHasKey('timestamp', $data['data']);
        
        // Verify timestamp is in ISO format
        $timestamp = $data['data']['timestamp'];
        $this->assertMatchesRegularExpression('/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $timestamp);
    }

    /**
     * Test health check is accessible without authentication.
     */
    public function test_health_check_is_public(): void
    {
        // Should work without any authentication headers
        $response = $this->get('/api/health');
        
        $response->assertStatus(200);
        $this->assertNotEquals(401, $response->getStatusCode());
    }
}