<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AIPromptService;

class TestAIProviders extends Command
{
    protected $signature = 'test:ai-providers';
    protected $description = 'Test AI provider configurations';

    public function handle()
    {
        $this->info('Testing AI Provider Configurations...');
        
        $providers = ['openai', 'claude', 'gemini', 'groq', 'deepseek'];
        $aiService = app(AIPromptService::class);
        
        foreach ($providers as $provider) {
            $this->info("Testing {$provider}...");
            
            try {
                $prompts = $aiService->generatePromptsForWebsite(
                    'https://example.com',
                    'test-session-' . time(),
                    $provider
                );
                
                if (count($prompts) > 0) {
                    $this->info("✅ {$provider}: Working! Generated " . count($prompts) . " prompts");
                } else {
                    $this->warn("⚠️  {$provider}: No prompts generated (using fallback)");
                }
            } catch (\Exception $e) {
                $this->error("❌ {$provider}: " . $e->getMessage());
            }
        }
        
        $this->info('Test completed!');
    }
}
