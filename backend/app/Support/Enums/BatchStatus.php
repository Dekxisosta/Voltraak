<?php

namespace App\Support\Enums;

enum BatchStatus: string
{
    case SAFE = 'safe';
    case WARNING = 'warning';
    case EXPIRED = 'expired';

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
            self::SAFE => 'Safe',
            self::WARNING => 'Warning',
            self::EXPIRED => 'Expired',
        };
    }

    /**
     * Get status color for UI.
     */
    public function getColor(): string
    {
        return match($this) {
            self::SAFE => 'green',
            self::WARNING => 'yellow',
            self::EXPIRED => 'red',
        };
    }
}