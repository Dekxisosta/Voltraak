<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fields the inventory-staff pages already show and send but the schema
 * could not store:
 *  - damage_reports.severity            (minor / moderate / severe)
 *  - discrepancy_reports.location       (bin/location the count was taken at)
 *  - discrepancy_reports.discrepancy_type (shortage, overage, theft, ...)
 *  - discrepancy_reports.physical_count_id (the count sent to the manager's
 *    adjustment-approval queue)
 *  - batches.is_prioritized             (flagged for priority FEFO picking)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('damage_reports', 'severity')) {
            Schema::table('damage_reports', function (Blueprint $table) {
                $table->enum('severity', ['minor', 'moderate', 'severe'])->default('minor')->after('damage_type');
            });
        }

        Schema::table('discrepancy_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('discrepancy_reports', 'location')) {
                $table->string('location', 100)->nullable()->after('batch_id');
            }
            if (!Schema::hasColumn('discrepancy_reports', 'discrepancy_type')) {
                $table->string('discrepancy_type', 30)->nullable()->after('type');
            }
            if (!Schema::hasColumn('discrepancy_reports', 'physical_count_id')) {
                $table->foreignId('physical_count_id')->nullable()->after('assigned_to')
                    ->constrained('physical_counts')->nullOnDelete();
            }
        });

        if (!Schema::hasColumn('batches', 'is_prioritized')) {
            Schema::table('batches', function (Blueprint $table) {
                $table->boolean('is_prioritized')->default(false)->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('batches', 'is_prioritized')) {
            Schema::table('batches', function (Blueprint $table) {
                $table->dropColumn('is_prioritized');
            });
        }

        if (Schema::hasColumn('discrepancy_reports', 'physical_count_id')) {
            Schema::table('discrepancy_reports', function (Blueprint $table) {
                $table->dropForeign(['physical_count_id']);
                $table->dropColumn('physical_count_id');
            });
        }
        Schema::table('discrepancy_reports', function (Blueprint $table) {
            foreach (['discrepancy_type', 'location'] as $column) {
                if (Schema::hasColumn('discrepancy_reports', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        if (Schema::hasColumn('damage_reports', 'severity')) {
            Schema::table('damage_reports', function (Blueprint $table) {
                $table->dropColumn('severity');
            });
        }
    }
};
