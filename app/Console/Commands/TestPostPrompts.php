<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Post;
use App\Models\AiModel;
use App\Services\PostPromptService;

class TestPostPrompts extends Command
{
    protected $signature = 'test:post-prompts';
    protected $description = 'Test post prompts functionality';

    public function handle()
    {
        // Check AI models
        $this->info('=== AI Models ===');
        $aiModels = AiModel::all();
        foreach ($aiModels as $model) {
            $status = $model->is_enabled ? 'ENABLED' : 'DISABLED';
            $this->line("- {$model->name} ({$model->display_name}) - {$status}");
        }
        
        $this->info("\n=== Posts ===");
        $posts = Post::with(['brand', 'user'])->take(3)->get();
        foreach ($posts as $post) {
            $this->line("- Post #{$post->id}: {$post->title}");
            $this->line("  Brand: {$post->brand->name}");
            $this->line("  URL: {$post->url}");
            $this->line("  Existing Prompts: " . $post->prompts()->count());
            $this->line("");
        }

        // Test prompt generation for first post
        if ($posts->count() > 0) {
            $post = $posts->first();
            $this->info("=== Testing Prompt Generation for Post #{$post->id} ===");
            
            $postPromptService = app(PostPromptService::class);
            
            try {
                $prompts = $postPromptService->generatePromptsFromMultipleModelsForPost(
                    $post, 
                    'test-session', 
                    'Testing post prompt generation functionality'
                );
                
                $this->info("Generated " . count($prompts) . " prompts:");
                foreach ($prompts as $prompt) {
                    $this->line("- [{$prompt->ai_provider}] {$prompt->prompt}");
                }
                
            } catch (\Exception $e) {
                $this->error("Error generating prompts: " . $e->getMessage());
                $this->error("Stack trace: " . $e->getTraceAsString());
            }
        }
        
        return 0;
    }
}
