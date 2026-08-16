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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'sent', 'received', 'completed', 'cancelled'])->default('draft');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->integer('total_items')->default(0);
            $table->date('order_date')->useCurrent();
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('po_number');
            $table->index('status');
            $table->index('order_date');
            $table->index('expected_delivery_date');
            $table->index(['supplier_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};