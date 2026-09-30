<?php

namespace App\Support\Enums;

/**
 * Status lifecycle for auto-generated reorder suggestions
 * (procurement_requests.status). Distinct from OrderStatus, which is used
 * by CustomerOrder, and from PurchaseOrderStatus, used by PurchaseOrder.
 */
enum ProcurementRequestStatus: string
{
    case GENERATED = 'generated';
    case REVIEWED = 'reviewed';
    case APPROVED = 'approved';
    case CONVERTED_TO_PO = 'converted_to_po';
    case DISMISSED = 'dismissed';

    /**
     * Get all status values.
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
            self::GENERATED => 'Generated',
            self::REVIEWED => 'Reviewed',
            self::APPROVED => 'Approved',
            self::CONVERTED_TO_PO => 'Converted to PO',
            self::DISMISSED => 'Dismissed',
        };
    }

    /**
     * Get status color for UI.
     */
    public function getColor(): string
    {
        return match($this) {
            self::GENERATED => 'gray',
            self::REVIEWED => 'blue',
            self::APPROVED => 'green',
            self::CONVERTED_TO_PO => 'purple',
            self::DISMISSED => 'red',
        };
    }
}
