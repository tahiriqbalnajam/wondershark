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
        // Update Perplexity model to use current model names
        $perplexityModel = AiModel::where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = $perplexityModel->api_config;
            $config['model'] = 'llama-3.1-sonar-small-128k-online'; // Current Perplexity model

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
        // Revert to old model name
        $perplexityModel = AiModel::where('name', 'perplexity')->first();

        if ($perplexityModel) {
            $config = $perplexityModel->api_config;
            $config['model'] = 'pplx-7b-chat'; // Old model name

            $perplexityModel->update([
                'api_config' => $config,
            ]);
        }
    }
};
