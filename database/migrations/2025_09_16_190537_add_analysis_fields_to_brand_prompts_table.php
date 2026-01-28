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
            $table->longText('ai_response')->nullable()->after('prompt');
            $table->json('resources')->nullable()->after('ai_response');
            $table->json('competitor_mentions')->nullable()->after('resources');
            $table->string('session_id')->nullable()->after('competitor_mentions');
            $table->timestamp('analysis_completed_at')->nullable()->after('session_id');
            $table->timestamp('analysis_failed_at')->nullable()->after('analysis_completed_at');
            $table->text('analysis_error')->nullable()->after('analysis_failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brand_prompts', function (Blueprint $table) {
            $table->dropColumn([
                'ai_response',
                'resources',
                'competitor_mentions',
                'session_id',
                'analysis_completed_at',
                'analysis_failed_at',
                'analysis_error',
            ]);
        });
    }
};
