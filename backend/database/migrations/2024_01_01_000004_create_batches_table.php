<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Support\Enums\BatchStatus;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('batch_number');
            $table->integer('quantity')->default(0);
            $table->integer('received_quantity')->default(0);
            $table->date('manufacture_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->enum('status', BatchStatus::values())->default(BatchStatus::SAFE->value);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('supplier_batch_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Unique constraint on product_id + batch_number
            $table->unique(['product_id', 'batch_number']);

            // Indexes
            $table->index('expiry_date');
            $table->index('status');
            $table->index('manufacture_date');
            $table->index('quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};