<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * T10: adjustments keep their direction.
 *
 * - Adds stock_transactions.reverses_transaction_id (unique): a transaction
 *   can be reversed at most once, enforced by the database.
 * - Backfills the sign of historic ADJUSTMENT rows. They were stored as
 *   abs(quantity); the direction survives in quantity_before/quantity_after.
 * - Links historic reversal rows to the transaction they reversed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->foreignId('reverses_transaction_id')
                ->nullable()
                ->after('reference_id')
                ->constrained('stock_transactions')
                ->restrictOnDelete();

            $table->unique('reverses_transaction_id');
        });

        // Decreases were stored positive; make them negative.
        DB::table('stock_transactions')
            ->where('type', 'adjustment')
            ->where('quantity', '>', 0)
            ->whereColumn('quantity_after', '<', 'quantity_before')
            ->update(['quantity' => DB::raw('-quantity')]);

        // Link existing reversals. If an original was (wrongly) reversed more
        // than once, only the first reversal can be linked; the unique index
        // would reject the rest.
        $seen = [];
        DB::table('stock_transactions')
            ->where('reference_type', 'transaction_reversal')
            ->whereNotNull('reference_id')
            ->orderBy('id')
            ->get(['id', 'reference_id'])
            ->each(function ($row) use (&$seen) {
                if (isset($seen[$row->reference_id])) {
                    return;
                }

                $seen[$row->reference_id] = true;

                DB::table('stock_transactions')
                    ->where('id', $row->id)
                    ->update(['reverses_transaction_id' => $row->reference_id]);
            });
    }

    public function down(): void
    {
        DB::table('stock_transactions')
            ->where('type', 'adjustment')
            ->where('quantity', '<', 0)
            ->update(['quantity' => DB::raw('-quantity')]);

        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropUnique(['reverses_transaction_id']);
            $table->dropConstrainedForeignId('reverses_transaction_id');
        });
    }
};
