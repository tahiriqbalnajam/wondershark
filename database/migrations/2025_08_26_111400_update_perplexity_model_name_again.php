<?php

use App\Models\AiModel;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update Perplexity model to use correct current model name
        $perplexityModel = AiModel::where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = $perplexityModel->api_config;
            // Using one of Perplexity's current main models
            // Try simpler model name
            $config['model'] = 'llama-3.1-sonar-small-128k-online';

            $perplexityModel->update([
                'api_config' => $config,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous model name
        $perplexityModel = AiModel::where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = $perplexityModel->api_config;
            $config['model'] = 'llama-3.1-sonar-small-128k-online';

            $perplexityModel->update([
                'api_config' => $config,
            ]);
        }
    }
};
