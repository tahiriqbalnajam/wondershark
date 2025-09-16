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
        Schema::create('ai_api_responses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('industry_analysis_id');
            $table->string('ai_provider'); // openai, gemini, perplexity, etc.
            $table->text('prompt_used');
            $table->longText('response_text');
            $table->json('brand_mentions')->nullable(); // Extracted brands with sentiment
            $table->json('source_mentions')->nullable(); // Extracted sources/domains
            $table->json('sentiment_analysis')->nullable(); // Overall sentiment data
            $table->decimal('confidence_score', 3, 2)->nullable(); // 0.00 to 1.00
            $table->integer('response_time_ms')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('industry_analysis_id')->references('id')->on('industry_analyses')->onDelete('cascade');
            $table->index(['industry_analysis_id', 'ai_provider']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_api_responses');
    }
};
