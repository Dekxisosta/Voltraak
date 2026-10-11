<?php

namespace App\Support\Enums;

enum OrderStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case FULFILLED = 'fulfilled';
    case CANCELLED = 'cancelled';

    /**
     * Get all order status values.
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
            self::PENDING => 'Pending',
            self::CONFIRMED => 'Confirmed',
            self::FULFILLED => 'Fulfilled',
            self::CANCELLED => 'Cancelled',
        };
    }

    /**
     * Get status color for UI.
     */
    public function getColor(): string
    {
        return match($this) {
            self::PENDING => 'yellow',
            self::CONFIRMED => 'blue',
            self::FULFILLED => 'green',
            self::CANCELLED => 'red',
        };
    }

    /**
     * Check if status allows modifications.
     */
    public function allowsModification(): bool
    {
        return in_array($this, [self::PENDING, self::CONFIRMED]);
    }
}