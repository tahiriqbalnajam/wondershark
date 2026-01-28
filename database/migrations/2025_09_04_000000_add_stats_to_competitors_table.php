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
        Schema::table('competitors', function (Blueprint $table) {
            // Add stats columns
            $table->integer('rank')->nullable()->comment('Market/search ranking position');
            $table->decimal('visibility', 8, 2)->nullable()->comment('Visibility score (0-100)');
            $table->decimal('sentiment', 8, 2)->nullable()->comment('Sentiment score (0-100)');

            // Additional useful metrics
            $table->integer('traffic_estimate')->nullable()->comment('Estimated monthly traffic');
            $table->decimal('market_share', 8, 2)->nullable()->comment('Market share percentage');
            $table->json('social_metrics')->nullable()->comment('Social media metrics');
            $table->timestamp('stats_updated_at')->nullable()->comment('When stats were last updated');

            // Index for performance
            $table->index(['rank', 'visibility', 'sentiment']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competitors', function (Blueprint $table) {
            $table->dropColumn([
                'rank',
                'visibility',
                'sentiment',
                'traffic_estimate',
                'market_share',
                'social_metrics',
                'stats_updated_at',
            ]);
        });
    }
};
