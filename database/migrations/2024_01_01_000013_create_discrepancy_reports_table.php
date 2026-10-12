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
        Schema::create('discrepancy_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['receiving', 'picking', 'counting', 'system'])->default('system');
            $table->integer('expected_quantity');
            $table->integer('actual_quantity');
            $table->integer('discrepancy')->storedAs('actual_quantity - expected_quantity');
            $table->text('description');
            $table->enum('status', ['open', 'investigating', 'resolved', 'closed'])->default('open');
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
            $table->text('investigation_notes')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->enum('root_cause', ['human_error', 'system_error', 'theft', 'damage', 'other'])->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('type');
            $table->index('reported_at');
            $table->index(['product_id', 'status']);
            $table->index('discrepancy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discrepancy_reports');
    }
};