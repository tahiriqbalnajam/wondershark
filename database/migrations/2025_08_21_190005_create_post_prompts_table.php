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
        Schema::create('post_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->string('session_id')->nullable();
            $table->text('prompt');
            $table->string('source')->default('ai_generated'); // ai_generated, user_added, fallback
            $table->string('ai_provider')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_selected')->default(true);
            $table->timestamps();
            
            $table->index(['post_id', 'is_selected']);
            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_prompts');
    }
};
