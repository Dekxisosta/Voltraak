<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->boolean('variance_approved')->default(false)->after('exceeds_threshold');
            $table->foreignId('approved_by')->nullable()->after('variance_approved')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->foreignId('adjustment_transaction_id')->nullable()->after('approved_at')->constrained('stock_transactions')->nullOnDelete();
            $table->text('approval_notes')->nullable()->after('adjustment_transaction_id');
            
            // Indexes for performance
            $table->index('variance_approved');
            $table->index(['variance_approved', 'exceeds_threshold']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropForeign(['adjustment_transaction_id']);
            $table->dropIndex(['physical_counts_variance_approved_index']);
            $table->dropIndex(['physical_counts_variance_approved_exceeds_threshold_index']);
            $table->dropColumn([
                'variance_approved',
                'approved_by',
                'approved_at',
                'adjustment_transaction_id',
                'approval_notes'
            ]);
        });
    }
};
