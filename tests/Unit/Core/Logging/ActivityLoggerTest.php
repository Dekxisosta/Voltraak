<?php

namespace Tests\Unit\Core\Logging;

use Tests\TestCase;
use App\Core\Logging\ActivityLogger;
use App\Models\User;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class ActivityLoggerTest extends TestCase
{
    use RefreshDatabase;

    private ActivityLogger $activityLogger;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->activityLogger = app(ActivityLogger::class);
        
        $this->user = User::factory()->create([
            'role' => UserRole::MANAGER,
        ]);
    }

    /**
     * Test basic activity logging.
     */
    public function test_can_log_basic_activity(): void
    {
        $this->activityLogger->logActivity(
            $this->user->id,
            'user.login',
            'User logged in successfully',
            ['ip_address' => '192.168.1.1']
        );

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->user->id,
            'action' => 'user.login',
            'description' => 'User logged in successfully',
        ]);

        $logEntry = DB::table('activity_logs')
            ->where('user_id', $this->user->id)
            ->first();

        $metadata = json_decode($logEntry->metadata, true);
        $this->assertEquals('192.168.1.1', $metadata['ip_address']);
    }

    /**
     * Test logging without user (system activity).
     */
    public function test_can_log_system_activity(): void
    {
        $this->activityLogger->logActivity(
            null,
            'system.maintenance',
            'System maintenance completed',
            ['duration' => '2 hours']
        );

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => null,
            'action' => 'system.maintenance',
            'description' => 'System maintenance completed',
        ]);
    }

    /**
     * Test logging inventory activities.
     */
    public function test_can_log_inventory_activity(): void
    {
        $productId = 123;
        $batchId = 456;

        $this->activityLogger->logInventoryActivity(
            $this->user->id,
            'inventory.stock_in',
            'Stock received from supplier',
            $productId,
            $batchId,
            [
                'quantity' => 50,
                'supplier_id' => 789,
                'unit_cost' => 99.99
            ]
        );

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->user->id,
            'action' => 'inventory.stock_in',
            'description' => 'Stock received from supplier',
        ]);

        $logEntry = DB::table('activity_logs')
            ->where('action', 'inventory.stock_in')
            ->first();

        $metadata = json_decode($logEntry->metadata, true);
        $this->assertEquals($productId, $metadata['product_id']);
        $this->assertEquals($batchId, $metadata['batch_id']);
        $this->assertEquals(50, $metadata['quantity']);
        $this->assertEquals(789, $metadata['supplier_id']);
        $this->assertEquals(99.99, $metadata['unit_cost']);
    }

    /**
     * Test logging authentication activities.
     */
    public function test_can_log_auth_activity(): void
    {
        $this->activityLogger->logAuthActivity(
            $this->user->id,
            'auth.password_changed',
            'User changed password',
            ['ip_address' => '10.0.0.1', 'user_agent' => 'Mozilla/5.0']
        );

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->user->id,
            'action' => 'auth.password_changed',
            'description' => 'User changed password',
        ]);

        $logEntry = DB::table('activity_logs')
            ->where('action', 'auth.password_changed')
            ->first();

        $metadata = json_decode($logEntry->metadata, true);
        $this->assertEquals('10.0.0.1', $metadata['ip_address']);
        $this->assertEquals('Mozilla/5.0', $metadata['user_agent']);
    }

    /**
     * Test logging security events.
     */
    public function test_can_log_security_events(): void
    {
        $this->activityLogger->logSecurityEvent(
            'security.suspicious_login',
            'Multiple failed login attempts detected',
            [
                'ip_address' => '192.168.1.100',
                'attempt_count' => 5,
                'email' => 'attacker@evil.com'
            ]
        );

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => null,
            'action' => 'security.suspicious_login',
            'description' => 'Multiple failed login attempts detected',
        ]);

        $logEntry = DB::table('activity_logs')
            ->where('action', 'security.suspicious_login')
            ->first();

        $metadata = json_decode($logEntry->metadata, true);
        $this->assertEquals('192.168.1.100', $metadata['ip_address']);
        $this->assertEquals(5, $metadata['attempt_count']);
    }

    /**
     * Test retrieving user activity history.
     */
    public function test_can_retrieve_user_activity_history(): void
    {
        // Log multiple activities for the user
        $activities = [
            ['action' => 'user.login', 'description' => 'Logged in'],
            ['action' => 'inventory.view_product', 'description' => 'Viewed product details'],
            ['action' => 'inventory.update_stock', 'description' => 'Updated stock levels'],
            ['action' => 'user.logout', 'description' => 'Logged out'],
        ];

        foreach ($activities as $activity) {
            $this->activityLogger->logActivity(
                $this->user->id,
                $activity['action'],
                $activity['description']
            );
        }

        $history = $this->activityLogger->getUserActivityHistory($this->user->id);

        $this->assertCount(4, $history);
        $this->assertEquals('user.logout', $history[0]->action); // Most recent first
        $this->assertEquals('user.login', $history[3]->action); // Oldest last
    }

    /**
     * Test retrieving activity history with date range.
     */
    public function test_can_retrieve_activity_history_with_date_range(): void
    {
        $startDate = now()->subDays(7);
        $endDate = now()->subDays(1);

        // Log activities at different times
        $this->activityLogger->logActivity(
            $this->user->id,
            'old.activity',
            'Old activity'
        );

        // Update timestamp to be within range
        DB::table('activity_logs')
            ->where('action', 'old.activity')
            ->update(['created_at' => $startDate->addDays(2)]);

        $this->activityLogger->logActivity(
            $this->user->id,
            'recent.activity',
            'Recent activity'
        );

        $history = $this->activityLogger->getUserActivityHistory(
            $this->user->id,
            $startDate,
            $endDate
        );

        $this->assertCount(1, $history);
        $this->assertEquals('old.activity', $history[0]->action);
    }

    /**
     * Test activity logging with complex metadata.
     */
    public function test_can_log_complex_metadata(): void
    {
        $complexMetadata = [
            'request_data' => [
                'product_id' => 123,
                'batch_data' => [
                    'batch_number' => 'BT-2024-001',
                    'expiry_date' => '2025-12-31',
                    'supplier' => [
                        'id' => 456,
                        'name' => 'Acme Corp',
                        'contact' => 'supplier@acme.com'
                    ]
                ]
            ],
            'performance_metrics' => [
                'execution_time' => 150.25,
                'memory_usage' => '2.5MB',
                'queries_executed' => 7
            ]
        ];

        $this->activityLogger->logActivity(
            $this->user->id,
            'inventory.complex_operation',
            'Complex inventory operation completed',
            $complexMetadata
        );

        $logEntry = DB::table('activity_logs')
            ->where('action', 'inventory.complex_operation')
            ->first();

        $retrievedMetadata = json_decode($logEntry->metadata, true);
        
        $this->assertEquals(123, $retrievedMetadata['request_data']['product_id']);
        $this->assertEquals('Acme Corp', $retrievedMetadata['request_data']['batch_data']['supplier']['name']);
        $this->assertEquals(150.25, $retrievedMetadata['performance_metrics']['execution_time']);
    }

    /**
     * Test bulk activity logging for performance.
     */
    public function test_can_bulk_log_activities(): void
    {
        $activities = [];
        
        for ($i = 1; $i <= 100; $i++) {
            $activities[] = [
                'user_id' => $this->user->id,
                'action' => "bulk.operation_{$i}",
                'description' => "Bulk operation {$i}",
                'metadata' => json_encode(['batch_number' => $i])
            ];
        }

        $this->activityLogger->bulkLogActivities($activities);

        $count = DB::table('activity_logs')
            ->where('user_id', $this->user->id)
            ->where('action', 'like', 'bulk.operation_%')
            ->count();

        $this->assertEquals(100, $count);
    }

    /**
     * Test activity logging with error handling.
     */
    public function test_handles_logging_errors_gracefully(): void
    {
        // Test with invalid metadata that might cause JSON encoding issues
        $invalidMetadata = [
            'recursive' => null
        ];
        $invalidMetadata['recursive'] = &$invalidMetadata; // Create circular reference

        // Should not throw exception
        $result = $this->activityLogger->logActivity(
            $this->user->id,
            'test.error_handling',
            'Testing error handling',
            $invalidMetadata
        );

        // Should return false on failure
        $this->assertFalse($result);
    }

    /**
     * Test activity search functionality.
     */
    public function test_can_search_activities(): void
    {
        // Log various activities
        $this->activityLogger->logActivity($this->user->id, 'inventory.create_product', 'Created Samsung Galaxy');
        $this->activityLogger->logActivity($this->user->id, 'inventory.update_product', 'Updated iPhone stock');
        $this->activityLogger->logActivity($this->user->id, 'user.login', 'User logged in');

        $searchResults = $this->activityLogger->searchActivities('Samsung');

        $this->assertCount(1, $searchResults);
        $this->assertEquals('inventory.create_product', $searchResults[0]->action);
        $this->assertStringContainsString('Samsung', $searchResults[0]->description);
    }

    /**
     * Test activity statistics generation.
     */
    public function test_can_generate_activity_statistics(): void
    {
        // Log activities for different users and actions
        $user2 = User::factory()->create();

        $this->activityLogger->logActivity($this->user->id, 'inventory.stock_in', 'Stock in operation');
        $this->activityLogger->logActivity($this->user->id, 'inventory.stock_out', 'Stock out operation');
        $this->activityLogger->logActivity($user2->id, 'inventory.stock_in', 'Another stock in');

        $stats = $this->activityLogger->getActivityStatistics(now()->subDay(), now()->addDay());

        $this->assertArrayHasKey('total_activities', $stats);
        $this->assertArrayHasKey('activities_by_action', $stats);
        $this->assertArrayHasKey('activities_by_user', $stats);

        $this->assertEquals(3, $stats['total_activities']);
        $this->assertEquals(2, $stats['activities_by_action']['inventory.stock_in']);
        $this->assertEquals(1, $stats['activities_by_action']['inventory.stock_out']);
    }
}