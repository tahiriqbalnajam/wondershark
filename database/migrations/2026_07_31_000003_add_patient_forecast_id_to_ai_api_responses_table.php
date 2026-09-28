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
        Schema::table('ai_api_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('patient_forecast_id')->nullable()->after('industry_analysis_id');

            $table->foreign('patient_forecast_id', 'fk_patient_forecast_ai_response')
                ->references('id')
                ->on('patient_forecasts')
                ->onDelete('cascade');

            $table->index(['patient_forecast_id', 'ai_provider'], 'idx_patient_forecast_provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_api_responses', function (Blueprint $table) {
            $table->dropIndex('idx_patient_forecast_provider');
            $table->dropForeign('fk_patient_forecast_ai_response');
            $table->dropColumn('patient_forecast_id');
        });
    }
};