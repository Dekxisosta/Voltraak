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
        Schema::create('procurement_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('current_stock');
            $table->integer('reorder_point');
            $table->integer('suggested_quantity');
            $table->decimal('average_daily_usage', 8, 2)->nullable();
            $table->integer('lead_time_days')->default(7);
            $table->integer('safety_stock')->default(0);
            $table->boolean('is_seasonal')->default(false);
            $table->decimal('seasonal_factor', 5, 2)->default(1.00);
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['generated', 'reviewed', 'approved', 'converted_to_po', 'dismissed'])->default('generated');
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('priority');
            $table->index('generated_at');
            $table->index(['product_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procurement_requests');
    }
};