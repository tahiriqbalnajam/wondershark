<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Patient-acquisition forecast audit rows (ai_api_responses with
     * patient_forecast_id set) have no industry_analysis_id. The original
     * column is NOT NULL without a default, which blocks those rows from
     * being inserted. Make it nullable so forecast-only audit rows can exist.
     */
    public function up(): void
    {
        Schema::table('ai_api_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('industry_analysis_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_api_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('industry_analysis_id')->nullable(false)->change();
        });
    }
};