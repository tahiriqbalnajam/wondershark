<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('industry_analyses', function (Blueprint $table) {
            // Add 'in_progress' to the enum
            DB::statement("ALTER TABLE industry_analyses MODIFY COLUMN status ENUM('pending', 'in_progress', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('industry_analyses', function (Blueprint $table) {
            // Revert the enum change
            DB::statement("ALTER TABLE industry_analyses MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending'");
        });
    }
};
