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
        Schema::create('brand_mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_prompt_id')->constrained()->onDelete('cascade');
            $table->foreignId('brand_id')->constrained()->onDelete('cascade');
            $table->foreignId('ai_model_id')->nullable()->constrained()->onDelete('set null');
            $table->string('entity_type'); // 'brand' or 'competitor'
            $table->foreignId('competitor_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('entity_name'); // Brand name or competitor name
            $table->string('entity_domain')->nullable(); // Domain for matching
            $table->integer('mention_count')->default(1); // How many times mentioned in this response
            $table->integer('position')->nullable(); // Position in the response (1 = first mentioned)
            $table->text('context')->nullable(); // Snippet of text where mention occurred
            $table->string('session_id')->nullable()->index(); // For grouping by analysis session
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamps();

            // Indexes for efficient querying
            $table->index(['brand_id', 'entity_type', 'analyzed_at']);
            $table->index(['brand_id', 'entity_domain', 'analyzed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_mentions');
    }
};
