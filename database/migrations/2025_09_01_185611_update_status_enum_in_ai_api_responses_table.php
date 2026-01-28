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
        Schema::table('ai_api_responses', function (Blueprint $table) {
            DB::statement("ALTER TABLE ai_api_responses MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending'");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_api_responses', function (Blueprint $table) {
            DB::statement("ALTER TABLE ai_api_responses MODIFY COLUMN status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending'");
        });
    }
};
