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
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity');
            $table->integer('received_quantity')->default(0);
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('total_cost', 12, 2)->storedAs('quantity * unit_cost');
            $table->text('specifications')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Unique constraint to prevent duplicate items in same PO
            $table->unique(['purchase_order_id', 'product_id']);

            // Indexes
            $table->index(['purchase_order_id', 'product_id']);
            $table->index('received_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};