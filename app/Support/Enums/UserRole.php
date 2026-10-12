<?php

namespace App\Support\Enums;

enum UserRole: string
{
    case WAREHOUSE = 'warehouse';
    case INVENTORY = 'inventory';
    case MANAGER = 'manager';

    /**
     * Get all role values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get role display name.
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::WAREHOUSE => 'Warehouse Staff',
            self::INVENTORY => 'Inventory Staff',
            self::MANAGER => 'Manager',
        };
    }

    /**
     * Check if role has access to specific feature.
     */
    public function hasAccess(string $feature): bool
    {
        return match($feature) {
            'warehouse' => in_array($this, [self::WAREHOUSE, self::INVENTORY, self::MANAGER]),
            'inventory' => in_array($this, [self::INVENTORY, self::MANAGER]),
            'manager' => $this === self::MANAGER,
            default => false,
        };
    }
}