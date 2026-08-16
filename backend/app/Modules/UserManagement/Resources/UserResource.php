<?php

namespace App\Modules\UserManagement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_display' => $this->role_display,
            'phone' => $this->phone,
            'department' => $this->department,
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            
            // Computed attributes
            'display_name' => $this->display_name,
            'initials' => $this->initials,
            
            // Include additional data based on request context
            'activity_summary' => $this->when(
                $request->get('include_activity'),
                fn() => $this->getRecentActivitySummary()
            ),
            
            'performance_metrics' => $this->when(
                $request->get('include_performance'),
                fn() => $this->getPerformanceMetrics()
            ),
            
            'attention_items' => $this->when(
                $request->get('include_attention'),
                fn() => $this->needsAttention()
            ),
            
            // Role-based permissions for current user
            'permissions' => $this->when(
                $request->user() && $request->user()->id === $this->id,
                function () {
                    $permissionService = app(\App\Core\Permissions\PermissionService::class);
                    return $permissionService->getUserPermissions($this->resource);
                }
            ),
            
            // Management information (only for managers viewing other users)
            'management_info' => $this->when(
                $request->user() && 
                $request->user()->isManager() && 
                $request->user()->id !== $this->id,
                [
                    'can_edit' => $this->canBeEditedBy($request->user()),
                    'can_delete' => $this->canBeDeletedBy($request->user()),
                    'has_active_sessions' => $this->tokens()->count() > 0,
                    'relationship_counts' => [
                        'stock_transactions' => $this->stockTransactions()->count(),
                        'physical_counts' => $this->physicalCounts()->count(),
                        'purchase_orders' => $this->purchaseOrders()->count(),
                        'procurement_requests' => $this->procurementRequests()->count(),
                    ]
                ]
            ),
            
            // Statistical information for the user's own profile
            'statistics' => $this->when(
                $request->user() && $request->user()->id === $this->id,
                [
                    'total_transactions' => $this->stockTransactions()->count(),
                    'total_counts' => $this->physicalCounts()->count(),
                    'total_purchase_orders' => $this->purchaseOrders()->count(),
                    'total_procurement_requests' => $this->procurementRequests()->count(),
                    'account_age_days' => $this->created_at->diffInDays(now()),
                    'last_activity' => $this->getLastActivityDate()?->toISOString(),
                ]
            )
        ];
    }

    /**
     * Check if this user can be edited by the given user.
     */
    private function canBeEditedBy($user): bool
    {
        // Users can edit themselves, managers can edit subordinates
        return $user->id === $this->id || 
               ($user->isManager() && $this->role !== \App\Support\Enums\UserRole::MANAGER);
    }

    /**
     * Check if this user can be deleted by the given user.
     */
    private function canBeDeletedBy($user): bool
    {
        // Cannot delete self, managers can delete subordinates without active relationships
        if ($user->id === $this->id) {
            return false;
        }
        
        if (!$user->isManager() || $this->role === \App\Support\Enums\UserRole::MANAGER) {
            return false;
        }
        
        // Check for relationships that prevent deletion
        $hasRelationships = $this->stockTransactions()->exists() ||
                          $this->physicalCounts()->exists() ||
                          $this->purchaseOrders()->exists() ||
                          $this->procurementRequests()->exists();
                          
        return !$hasRelationships;
    }

    /**
     * Get the last activity date across all modules.
     */
    private function getLastActivityDate(): ?\Carbon\Carbon
    {
        $lastTransactionDate = $this->stockTransactions()->latest()->value('created_at');
        $lastCountDate = $this->physicalCounts()->latest()->value('created_at');
        $lastPODate = $this->purchaseOrders()->latest()->value('created_at');
        $lastRequestDate = $this->procurementRequests()->latest()->value('created_at');
        
        $dates = collect([$lastTransactionDate, $lastCountDate, $lastPODate, $lastRequestDate])
            ->filter()
            ->map(fn($date) => \Carbon\Carbon::parse($date));
            
        return $dates->isNotEmpty() ? $dates->max() : null;
    }
}