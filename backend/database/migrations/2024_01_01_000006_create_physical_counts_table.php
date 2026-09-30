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
        Schema::create('physical_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('counted_by')->constrained('users')->cascadeOnDelete();
            $table->integer('system_quantity');
            $table->integer('counted_quantity');
            $table->integer('variance')->storedAs('counted_quantity - system_quantity');
            $table->decimal('variance_percentage', 5, 2)->nullable();
            $table->decimal('accuracy_percentage', 5, 2)->nullable();
            $table->boolean('exceeds_threshold')->default(false);
            $table->decimal('threshold_used', 5, 2)->default(5.00);
            $table->string('count_reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('count_date')->useCurrent();
            $table->timestamps();

            // Indexes
            $table->index('count_date');
            $table->index('exceeds_threshold');
            $table->index(['product_id', 'count_date']);
            $table->index('variance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('physical_counts');
    }
};