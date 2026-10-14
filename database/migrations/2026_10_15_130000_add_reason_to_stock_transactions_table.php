<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Stock In/Out page records why stock moved ("Purchase Order Receipt",
 * "Customer Order", ...). reference_type/reference_id are a typed link to
 * another record and cannot hold that free label, so it gets its own column.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('stock_transactions', 'reason')) {
            Schema::table('stock_transactions', function (Blueprint $table) {
                $table->string('reason', 100)->nullable()->after('reference_number');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('stock_transactions', 'reason')) {
            Schema::table('stock_transactions', function (Blueprint $table) {
                $table->dropColumn('reason');
            });
        }
    }
};
