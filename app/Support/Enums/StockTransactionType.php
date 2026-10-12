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
     * Check if transaction type increases stock.
     */
    public function increasesStock(): bool
    {
        return in_array($this, [self::IN, self::RETURN]);
    }

    /**
     * Check if transaction type decreases stock.
     */
    public function decreasesStock(): bool
    {
        return in_array($this, [self::OUT, self::ADJUSTMENT]);
    }
}