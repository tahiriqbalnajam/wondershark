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
        Schema::create('ai_models', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // openai, gemini, perplexity
            $table->string('display_name'); // OpenAI GPT-4, Google Gemini, etc.
            $table->boolean('is_enabled')->default(true);
            $table->integer('prompts_per_brand')->default(25);
            $table->json('api_config')->nullable(); // API keys, endpoints, etc.
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_models');
    }
};
