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
        // Update Perplexity model to use sonar-pro
        $perplexityModel = DB::table('ai_models')->where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = json_decode($perplexityModel->api_config, true);
            $config['model'] = 'sonar-pro';

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
