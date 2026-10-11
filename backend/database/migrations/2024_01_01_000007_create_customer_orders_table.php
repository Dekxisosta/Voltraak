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
        Schema::create('customer_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('customer_phone')->nullable();
            $table->text('customer_address')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'fulfilled', 'cancelled'])->default('pending');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->integer('total_items')->default(0);
            $table->date('required_date')->nullable();
            $table->date('fulfilled_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('order_date')->useCurrent();
            $table->timestamps();

            // Indexes
            $table->index('order_number');
            $table->index('status');
            $table->index('order_date');
            $table->index('required_date');
            $table->index('customer_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_orders');
    }
};