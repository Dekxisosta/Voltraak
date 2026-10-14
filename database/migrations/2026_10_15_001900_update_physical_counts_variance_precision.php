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
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->decimal('variance_percentage', 8, 2)->nullable()->change();
            $table->decimal('accuracy_percentage', 8, 2)->nullable()->change();
            $table->decimal('threshold_used', 8, 2)->default(5.00)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('physical_counts', function (Blueprint $table) {
            $table->decimal('variance_percentage', 5, 2)->nullable()->change();
            $table->decimal('accuracy_percentage', 5, 2)->nullable()->change();
            $table->decimal('threshold_used', 5, 2)->default(5.00)->change();
        });
    }
};
