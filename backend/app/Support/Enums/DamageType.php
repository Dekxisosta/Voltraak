<?php

namespace App\Support\Enums;

enum DamageType: string
{
    case EXPIRED = 'expired';
    case PHYSICAL = 'physical';
    case WATER = 'water';
    case THEFT = 'theft';
    case OTHER = 'other';

    /**
     * Get all damage type values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get damage type display name.
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::EXPIRED => 'Expired',
            self::PHYSICAL => 'Physical Damage',
            self::WATER => 'Water Damage',
            self::THEFT => 'Theft/Missing',
            self::OTHER => 'Other',
        };
    }

    /**
     * Get damage type color for UI.
     */
    public function getColor(): string
    {
        return match($this) {
            self::EXPIRED => 'orange',
            self::PHYSICAL => 'red',
            self::WATER => 'blue',
            self::THEFT => 'purple',
            self::OTHER => 'gray',
        };
    }
}