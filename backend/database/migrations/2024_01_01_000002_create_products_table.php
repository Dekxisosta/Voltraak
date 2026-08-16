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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('category')->nullable();
            $table->text('description')->nullable();
            $table->decimal('unit_price', 10, 2);
            $table->integer('quantity')->default(0);
            $table->integer('reorder_level')->default(0);
            $table->integer('max_stock_level')->nullable();
            $table->boolean('is_seasonal')->default(false);
            $table->integer('shelf_life_days')->nullable();
            $table->string('storage_bin')->nullable();
            $table->string('barcode')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index('sku');
            $table->index('category');
            $table->index('is_seasonal');
            $table->index('is_active');
            $table->index('quantity');
            $table->index('reorder_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};