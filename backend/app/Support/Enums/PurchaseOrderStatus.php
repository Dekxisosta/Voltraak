<?php

namespace App\Support\Enums;

enum PurchaseOrderStatus: string
{
    case DRAFT = 'draft';
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case SENT = 'sent';
    case RECEIVED = 'received';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    /**
     * Get all PO status values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get status display name.
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::DRAFT => 'Draft',
            self::PENDING => 'Pending Approval',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::SENT => 'Sent to Supplier',
            self::RECEIVED => 'Received',
            self::COMPLETED => 'Completed',
            self::CANCELLED => 'Cancelled',
        };
    }

    /**
     * Get status color for UI.
     */
    public function getColor(): string
    {
        return match($this) {
            self::DRAFT => 'gray',
            self::PENDING => 'yellow',
            self::APPROVED => 'blue',
            self::REJECTED => 'red',
            self::SENT => 'purple',
            self::RECEIVED => 'green',
            self::COMPLETED => 'green',
            self::CANCELLED => 'red',
        };
    }

    /**
     * Check if status allows editing.
     */
    public function allowsEditing(): bool
    {
        return in_array($this, [self::DRAFT, self::PENDING]);
    }

    /**
     * Check if status requires approval.
     */
    public function requiresApproval(): bool
    {
        return $this === self::PENDING;
    }

    /**
     * Get next possible statuses.
     */
    public function getNextStatuses(): array
    {
        return match($this) {
            self::DRAFT => [self::PENDING, self::CANCELLED],
            self::PENDING => [self::APPROVED, self::REJECTED],
            self::APPROVED => [self::SENT, self::CANCELLED],
            self::SENT => [self::RECEIVED, self::CANCELLED],
            self::RECEIVED => [self::COMPLETED],
            default => [],
        };
    }
}