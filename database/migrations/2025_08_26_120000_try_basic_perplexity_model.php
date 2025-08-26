<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Try the most basic Perplexity model name
        $perplexityModel = DB::table('ai_models')->where('name', 'perplexity')->first();
        
        if ($perplexityModel) {
            $config = json_decode($perplexityModel->api_config, true);
            // Try the most basic model name that might work
            $config['model'] = 'llama-3.1-sonar-small-128k-chat';
            
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
            $config['model'] = 'llama-3.1-sonar-huge-128k-online';
            
            DB::table('ai_models')
                ->where('name', 'perplexity')
                ->update(['api_config' => json_encode($config)]);
        }
    }
};
