<?php

namespace App\Support\Enums;

enum StockTransactionType: string
{
    case IN = 'in';
    case OUT = 'out';
    case TRANSFER = 'transfer';
    case RETURN = 'return';
    case ADJUSTMENT = 'adjustment';

    /**
     * Get all transaction type values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get transaction type display name.
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::IN => 'Stock In',
            self::OUT => 'Stock Out',
            self::TRANSFER => 'Transfer',
            self::RETURN => 'Return',
            self::ADJUSTMENT => 'Adjustment',
        };
    }

    /**
     * Whether the direction is carried by the sign of the stored quantity
     * rather than by the type. Only ADJUSTMENT is signed: a positive quantity
     * is an increase, a negative one a decrease. All other types store a
     * positive magnitude and the type gives the direction.
     */
    public function isSigned(): bool
    {
        return $this === self::ADJUSTMENT;
    }

    /**
     * Check if the type always increases stock.
     *
     * Always false for ADJUSTMENT: its direction depends on the sign of the
     * quantity, so ask the StockTransaction instead.
     */
    public function increasesStock(): bool
    {
        return in_array($this, [self::IN, self::RETURN]);
    }

    /**
     * Check if the type always decreases stock.
     *
     * Always false for ADJUSTMENT: its direction depends on the sign of the
     * quantity, so ask the StockTransaction instead.
     */
    public function decreasesStock(): bool
    {
        return $this === self::OUT;
    }
}