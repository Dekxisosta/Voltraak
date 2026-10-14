<?php

namespace App\Support\Enums;

enum UserRole: string
{
    case WAREHOUSE        = 'warehouse';
    case INVENTORY_STAFF  = 'inventory_staff';
    case MANAGER          = 'manager';
    case ADMIN            = 'admin';

    /**
     * Get all role values.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Human-readable display name.
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::WAREHOUSE       => 'Warehouse Staff',
            self::INVENTORY_STAFF => 'Inventory Staff',
            self::MANAGER         => 'Manager',
            self::ADMIN           => 'Administrator',
        };
    }

    /**
     * Check if role has access to a feature area.
     */
    public function hasAccess(string $feature): bool
    {
        return match($feature) {
            'warehouse'  => in_array($this, [self::WAREHOUSE, self::INVENTORY_STAFF, self::MANAGER, self::ADMIN]),
            'inventory'  => in_array($this, [self::INVENTORY_STAFF, self::MANAGER, self::ADMIN]),
            'manager'    => in_array($this, [self::MANAGER, self::ADMIN]),
            'admin'      => $this === self::ADMIN,
            default      => false,
        };
    }
}
