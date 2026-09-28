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
        Schema::create('patient_forecasts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('brand_id');
            $table->unsignedBigInteger('competitor_id')->nullable(); // NULL = the brand's own row
            $table->string('analysis_session_id', 255);
            $table->string('region', 100)->nullable();
            $table->string('procedure', 255)->nullable();
            $table->decimal('visibility', 5, 2)->nullable();        // snapshot from old BVI
            $table->decimal('market_share', 5, 2)->nullable();      // (entity_BVI / Σ BVI) × 100
            $table->unsignedTinyInteger('ai_usage_rate')->default(47);
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->integer('booked_consultations_estimated')->nullable();
            $table->integer('new_patients_lower')->nullable();
            $table->integer('new_patients_upper')->nullable();
            $table->json('assumptions')->nullable(); // AI intermediate values; audit only, never rendered
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('brand_id')->references('id')->on('brands')->onDelete('cascade');
            $table->foreign('competitor_id')->references('id')->on('competitors')->onDelete('cascade');
            $table->unique(['brand_id', 'competitor_id', 'analysis_session_id'], 'uniq_pf_brand_competitor_session');
            $table->index(['brand_id', 'analysis_session_id'], 'idx_pf_brand_session');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_forecasts');
    }
};