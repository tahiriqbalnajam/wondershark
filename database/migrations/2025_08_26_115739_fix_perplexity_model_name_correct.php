<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Try another Perplexity model name format
        $perplexityModel = DB::table('ai_models')->where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = json_decode($perplexityModel->api_config, true);
            // Try model name without prefixes - this might be correct
            $config['model'] = 'llama-3.1-sonar-huge-128k-online';

            DB::table('ai_models')
                ->where('name', 'perplexity')
                ->update(['api_config' => json_encode($config)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back if needed
        $perplexityModel = DB::table('ai_models')->where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = json_decode($perplexityModel->api_config, true);
            $config['model'] = 'sonar-small-online';

            DB::table('ai_models')
                ->where('name', 'perplexity')
                ->update(['api_config' => json_encode($config)]);
        }
    }
};
