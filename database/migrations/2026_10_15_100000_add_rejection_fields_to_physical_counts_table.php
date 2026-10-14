<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A manager can reject a variance adjustment instead of approving it.
     * Rejection leaves stock untouched, so it needs its own audit trail
     * (who/when/why) separate from the approval columns.
     */
    public function up(): void
    {
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->foreignId('rejected_by')->nullable()->after('approval_notes')->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable()->after('rejected_by');
            $table->text('rejection_notes')->nullable()->after('rejected_at');

            $table->index('rejected_at');
        });
    }

    public function down(): void
    {
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->dropForeign(['rejected_by']);
            $table->dropIndex(['rejected_at']);
            $table->dropColumn(['rejected_by', 'rejected_at', 'rejection_notes']);
        });
    }
};
