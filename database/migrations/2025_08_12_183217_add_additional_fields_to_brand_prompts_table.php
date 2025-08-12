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
            $table->integer('position')->default(0)->after('order');
            $table->enum('sentiment', ['positive', 'neutral', 'negative'])->default('neutral')->after('position');
            $table->enum('visibility', ['public', 'private', 'draft'])->default('public')->after('sentiment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brand_prompts', function (Blueprint $table) {
            $table->dropColumn(['position', 'sentiment', 'visibility']);
        });
    }
};
