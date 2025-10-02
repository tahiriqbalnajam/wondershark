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
        Schema::create('brand_competitive_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained()->onDelete('cascade');
            $table->string('entity_type'); // 'brand' or 'competitor'
            $table->foreignId('competitor_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('entity_name'); // Brand name or competitor name
            $table->string('entity_url'); // Brand URL or competitor URL
            $table->decimal('visibility', 5, 2); // 0.00 to 100.00 (percentage)
            $table->integer('sentiment'); // 0 to 100 scale
            $table->decimal('position', 3, 1); // 1.0 to 10.0 (lower is better)
            $table->json('raw_data')->nullable(); // Store raw analysis data
            $table->string('analysis_session_id')->nullable();
            $table->timestamp('analyzed_at');
            $table->timestamps();
            
            $table->index(['brand_id', 'entity_type', 'analyzed_at']);
            $table->index(['brand_id', 'competitor_id', 'analyzed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_competitive_stats');
    }
};
