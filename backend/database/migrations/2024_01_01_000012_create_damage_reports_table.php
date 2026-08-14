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
        Schema::create('damage_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('quantity_damaged');
            $table->enum('damage_type', ['expired', 'physical', 'water', 'theft', 'other'])->default('other');
            $table->text('description');
            $table->decimal('estimated_value', 12, 2)->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('status', ['reported', 'investigated', 'approved', 'written_off'])->default('reported');
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('investigated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('investigated_at')->nullable();
            $table->text('investigation_notes')->nullable();
            $table->text('action_taken')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('damage_type');
            $table->index('reported_at');
            $table->index(['product_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('damage_reports');
    }
};