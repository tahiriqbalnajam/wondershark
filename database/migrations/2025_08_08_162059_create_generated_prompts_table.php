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
        Schema::create('generated_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('session_id'); // For tracking prompts during creation process
            $table->text('prompt');
            $table->string('source')->default('ai_generated'); // ai_generated or user_added
            $table->string('ai_provider')->nullable(); // openai, claude, gemini, etc.
            $table->integer('order')->default(0);
            $table->boolean('is_selected')->default(true);
            $table->timestamps();

            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_prompts');
    }
};
