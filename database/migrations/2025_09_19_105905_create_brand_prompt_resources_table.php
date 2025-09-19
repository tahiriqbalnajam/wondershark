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
        Schema::create('brand_prompt_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_prompt_id')->constrained()->onDelete('cascade');
            $table->string('url', 2048);
            $table->string('type', 100)->nullable(); // e.g., 'competitor', 'industry_report', 'news', 'documentation', etc.
            $table->string('domain', 255)->nullable(); // extracted domain for easy filtering
            $table->string('title', 500)->nullable(); // resource title if available
            $table->text('description')->nullable(); // brief description of the resource
            $table->boolean('is_competitor_url')->default(false);
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index(['brand_prompt_id', 'type']);
            $table->index(['domain', 'is_competitor_url']);
            $table->index('is_competitor_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_prompt_resources');
    }
};
