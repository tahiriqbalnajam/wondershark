<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\AiModel;

class AiModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $aiModels = [
            [
                'name' => 'openai',
                'display_name' => 'OpenAI (ChatGPT)',
                'is_enabled' => true,
                'prompts_per_brand' => 25,
                'api_config' => [
                    'api_key' => '',
                    'model' => 'gpt-4',
                    'endpoint' => 'https://api.openai.com/v1/chat/completions'
                ],
                'order' => 1
            ],
            [
                'name' => 'gemini',
                'display_name' => 'Google Gemini',
                'is_enabled' => true,
                'prompts_per_brand' => 25,
                'api_config' => [
                    'api_key' => '',
                    'model' => 'gemini-pro',
                    'endpoint' => 'https://generativelanguage.googleapis.com/v1/models'
                ],
                'order' => 2
            ],
            [
                'name' => 'perplexity',
                'display_name' => 'Perplexity AI',
                'is_enabled' => true,
                'prompts_per_brand' => 25,
                'api_config' => [
                    'api_key' => '',
                    'model' => 'pplx-7b-chat',
                    'endpoint' => 'https://api.perplexity.ai/chat/completions'
                ],
                'order' => 3
            ],
            [
                'name' => 'anthropic',
                'display_name' => 'Anthropic Claude',
                'is_enabled' => false,
                'prompts_per_brand' => 0,
                'api_config' => [
                    'api_key' => '',
                    'model' => 'claude-3-sonnet-20240229',
                    'endpoint' => 'https://api.anthropic.com/v1/messages'
                ],
                'order' => 4
            ]
        ];

        foreach ($aiModels as $aiModel) {
            AiModel::updateOrCreate(
                ['name' => $aiModel['name']],
                $aiModel
            );
        }
    }
}
