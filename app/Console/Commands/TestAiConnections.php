<?php

namespace App\Console\Commands;

use App\Models\AiModel;
use App\Services\PostPromptService;
use Illuminate\Console\Command;

class TestAiConnections extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:test-connections {provider?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test AI model connections and configurations';

    /**
     * Execute the console command.
     */
    public function handle(PostPromptService $postPromptService)
    {
        $provider = $this->argument('provider');

        if ($provider) {
            // Test specific provider
            $this->info("Testing connection for: {$provider}");
            $result = $postPromptService->testPostPromptGeneration($provider);

            if ($result['success']) {
                $this->info("✅ {$result['model']} - Connection successful");
                $this->line("Questions generated: {$result['questions_generated']}");
                $this->line('Sample questions:');
                foreach ($result['sample_questions'] as $index => $question) {
                    $this->line('  '.($index + 1).". {$question}");
                }
            } else {
                $this->error("❌ {$provider} - {$result['message']}");
            }
        } else {
            // Test all connections
            $this->info('Testing all AI model connections...');

            $results = $postPromptService->testAllAiModelConnections();

            foreach ($results as $provider => $result) {
                if ($result['success']) {
                    $this->info("✅ {$provider} - Connection successful");
                } else {
                    $this->error("❌ {$provider} - {$result['message']}");
                }
            }

            $this->newLine();
            $this->info('Testing prompt generation for each model...');

            $models = AiModel::enabled()->get();
            foreach ($models as $model) {
                $this->line("\nTesting {$model->display_name}...");
                $result = $postPromptService->testPostPromptGeneration($model->name);

                if ($result['success']) {
                    $this->info("✅ Generated {$result['questions_generated']} questions");
                    $this->line('Sample: '.($result['sample_questions'][0] ?? 'None'));
                } else {
                    $this->error("❌ Failed: {$result['message']}");
                }
            }
        }

        return 0;
    }
}
