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
        Schema::table('brand_prompts', function (Blueprint $table) {
            // Update analysis fields to varchar(255) for more flexibility
            $table->string('sentiment', 255)->nullable()->change();
            $table->string('position', 255)->nullable()->change();
            $table->string('visibility', 255)->nullable()->change();
            $table->string('competitor_mentions', 1000)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brand_prompts', function (Blueprint $table) {
            // Revert back to original types
            $table->enum('sentiment', ['positive', 'neutral', 'negative'])->nullable()->change();
            $table->integer('position')->nullable()->change();
            $table->enum('visibility', ['public', 'private', 'draft'])->nullable()->change();
            $table->json('competitor_mentions')->nullable()->change();
        });
    }
};
