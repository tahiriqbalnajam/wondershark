<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class RunCitationChecks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'citations:run {--post= : The ID of a specific post to check}';
    protected $description = 'Runs individual AI prompt citation checks for all valid posts, or a specific post ID';

    public function handle(\App\Services\CitationCheckService $citationService)
    {
        $postId = $this->option('post');

        if ($postId) {
            $this->info("Running citation check for specific Post ID: {$postId}");
            $post = \App\Models\Post::find($postId);
            
            if (!$post) {
                $this->error("Post not found with ID: {$postId}");
                return 1;
            }
            
            $posts = collect([$post]);
        } else {
            $this->info("Fetching posts that need citation checking...");
            // Grab posts that have generated prompts and are either brand new or haven't been checked recently
            $posts = \App\Models\Post::where('status', 'published')
                ->whereHas('brand', function($q) {
                    $q->where('status', 'active');
                })
                ->whereHas('prompts', function($q) {
                    $q->where('is_selected', true);
                })
                ->get();
            $this->info("Found {$posts->count()} posts to check.");
        }

        foreach ($posts as $post) {
            $this->line("Checking Post ID: {$post->id} - {$post->url}");

            // Skip posts whose brand user lacks an active subscription
            $brand = $post->brand;
            $brandUser = $brand ? \App\Models\User::find($brand->user_id ?? $brand->agency_id) : null;
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                $this->warn("Skipping Post {$post->id} — brand user has no active subscription");
                continue;
            }

            try {
                $result = $citationService->runCitationCheck($post);
                
                if ($result['success']) {
                    $this->info("Successfully completed checks for Post {$post->id}");
                } else {
                    $this->error("Failed checks for Post {$post->id}: " . ($result['message'] ?? 'Unknown error'));
                }
                
                // Add a small delay between posts to avoid rate limits
                sleep(2);
                
            } catch (\Exception $e) {
                $this->error("Exception while checking Post {$post->id}: " . $e->getMessage());
            }
        }

        $this->info('Finished running citation checks.');
        return 0;
    }
}
