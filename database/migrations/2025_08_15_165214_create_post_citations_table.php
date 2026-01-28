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
        Schema::create('post_citations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->enum('ai_model', ['openai', 'gemini', 'perplexity', 'claude', 'groq', 'deepseek']);
            $table->text('citation_text')->nullable();
            $table->string('citation_url')->nullable();
            $table->integer('position')->nullable(); // Position in the AI response
            $table->boolean('is_mentioned')->default(false);
            $table->json('metadata')->nullable(); // For additional AI-specific data
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique(['post_id', 'ai_model']);
            $table->index(['ai_model', 'is_mentioned']);
            $table->index(['post_id', 'checked_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_citations');
    }
};
