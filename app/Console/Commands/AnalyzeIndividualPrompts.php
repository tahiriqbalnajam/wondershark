<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class AnalyzeIndividualPrompts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'prompts:analyze {--post= : Re-run specific post}';
    protected $description = 'Run citation checks sequentially across every selected individual prompt for posts.';

    public function handle(\App\Services\CitationCheckService $citationService)
    {
        $postId = $this->option('post');

        if ($postId) {
            $this->info("Fetching specific Post ID: {$postId}");
            $query = \App\Models\Post::where('id', $postId);
        } else {
            $this->info("Fetching all posts with un-evaluated selected prompts...");
            $query = \App\Models\Post::whereHas('prompts', function($q) {
                $q->where('is_selected', true);
            });
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            $this->info("No posts found with selected prompts to analyze.");
            return 0;
        }

        $this->info("Found {$posts->count()} posts to evaluate.");

        foreach ($posts as $post) {
            $this->line("Processing Post #{$post->id}: {$post->url}");
            
            // Re-use the smart parsing logic we just added to CitationCheckService
            // that handles iteration by prompts rather than by post
            try {
                $result = $citationService->runCitationCheck($post);
                
                if ($result['success']) {
                    $this->info("Successfully evaluated all prompts for Post #{$post->id}");
                } else {
                    $this->error("Failed to evaluate Post #{$post->id}: " . ($result['message'] ?? 'Unknown Error'));
                }
            } catch (\Exception $e) {
                $this->error("Fatal error on Post {$post->id}: " . $e->getMessage());
            }

            // Sleep safely to avoid rapid rate limitations
            sleep(3);
        }

        $this->info("\nPrompt Analysis Cycle Complete!");
        return 0;
    }
}
