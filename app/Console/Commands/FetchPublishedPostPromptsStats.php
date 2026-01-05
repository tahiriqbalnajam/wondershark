<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\PostPromptService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FetchPublishedPostPromptsStats extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'posts:fetch-prompts-stats 
                           {--post= : Specific post ID to analyze}
                           {--days=7 : Number of days to look back for published posts}
                           {--limit= : Limit number of posts to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and update prompt stats for published posts';

    protected PostPromptService $postPromptService;

    public function __construct(PostPromptService $postPromptService)
    {
        parent::__construct();
        $this->postPromptService = $postPromptService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀 Starting to fetch post prompt stats...');

        $postId = $this->option('post');
        $days = (int) $this->option('days');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        // Build query for published posts
        $query = Post::query()
            ->where('status', 'published')
            ->with(['prompts', 'brand'])
            ->orderBy('posted_at', 'desc');

        if ($postId) {
            // Process specific post
            $query->where('id', $postId);
            $this->info("Processing specific post ID: {$postId}");
        } else {
            // Process posts from the last N days
            $query->where('posted_at', '>=', now()->subDays($days));
            $this->info("Processing posts from the last {$days} days");
        }

        if ($limit) {
            $query->limit($limit);
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            $this->warn('No published posts found to process');

            return self::SUCCESS;
        }

        $this->info("Found {$posts->count()} post(s) to process");

        $progressBar = $this->output->createProgressBar($posts->count());
        $progressBar->start();

        $successCount = 0;
        $errorCount = 0;
        $promptsProcessed = 0;

        foreach ($posts as $post) {
            try {
                $prompts = $post->prompts;

                if ($prompts->isEmpty()) {
                    $this->newLine();
                    $this->comment("Post #{$post->id} has no prompts - skipping");
                    $progressBar->advance();

                    continue;
                }

                foreach ($prompts as $prompt) {
                    try {
                        // Analyze and update stats for this prompt
                        $stats = $this->postPromptService->analyzePromptStatsWithAI($prompt, $post);

                        // Update prompt with new stats
                        $prompt->update([
                            'visibility' => $stats['visibility'],
                            'position' => $stats['position'],
                            'sentiment' => $stats['sentiment'],
                            'volume' => $stats['volume'],
                            'analysis_completed_at' => now(),
                            'analysis_failed_at' => null,
                            'analysis_error' => null,
                        ]);

                        $promptsProcessed++;

                        Log::info('Post prompt stats updated', [
                            'post_id' => $post->id,
                            'prompt_id' => $prompt->id,
                            'stats' => $stats,
                        ]);
                    } catch (\Exception $e) {
                        $errorCount++;

                        // Log error on the prompt
                        $prompt->update([
                            'analysis_failed_at' => now(),
                            'analysis_error' => $e->getMessage(),
                        ]);

                        Log::error('Failed to analyze post prompt', [
                            'post_id' => $post->id,
                            'prompt_id' => $prompt->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $successCount++;

            } catch (\Exception $e) {
                $errorCount++;
                $this->newLine();
                $this->error("Failed to process post #{$post->id}: {$e->getMessage()}");

                Log::error('Failed to process post for prompt stats', [
                    'post_id' => $post->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->info('✅ Post prompt stats fetch completed!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Posts Processed', $successCount],
                ['Prompts Updated', $promptsProcessed],
                ['Errors', $errorCount],
            ]
        );

        return self::SUCCESS;
    }
}
