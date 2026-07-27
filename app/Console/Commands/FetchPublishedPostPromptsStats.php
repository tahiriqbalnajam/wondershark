<?php

namespace App\Console\Commands;

use App\Jobs\FetchPostPromptsStatsJob;
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
                           {--brand= : Specific brand ID to analyze}
                           {--days=7 : Number of days to look back for published posts}
                           {--limit= : Limit number of posts to process}
                           {--all : Process all published posts across all brands}';

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
        $this->info('Starting to queue post prompt stats fetch...');

        $postId = $this->option('post');
        $brandId = $this->option('brand');
        $processAll = $this->option('all');
        $days = (int) $this->option('days');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        // Build query for published posts from active brands only
        $query = Post::query()
            ->where('status', 'published')
            ->whereHas('brand', function ($q) {
                $q->where('status', 'active');
            })
            ->with(['brand'])
            ->orderBy('posted_at', 'desc');

        if ($postId) {
            // Process specific post
            $query->where('id', $postId);
            $this->info("Processing specific post ID: {$postId}");
        } elseif ($brandId) {
            // Process specific brand
            $query->where('brand_id', $brandId);
            $this->info("Processing posts for brand ID: {$brandId}");
        } elseif ($processAll) {
            // Process ALL published posts from active brands
            $this->info('Processing all published posts from active brands');
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

        $queuedCount = 0;
        $skippedCount = 0;

        foreach ($posts as $post) {
            try {
                // Skip if the brand owner's trial has expired and they have no active subscription
                $brandUser = \App\Models\User::find($post->brand->user_id ?? $post->brand->agency_id);
                if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                    Log::info('Skipping post prompt stats fetch — trial expired, no active subscription', [
                        'post_id' => $post->id,
                        'brand_id' => $post->brand_id,
                        'user_id' => $brandUser->id,
                    ]);
                    $skippedCount++;

                    continue;
                }

                $this->line("  Queuing stats fetch for post #{$post->id}...");
                FetchPostPromptsStatsJob::dispatch($post)->onQueue('default');
                $queuedCount++;
            } catch (\Exception $e) {
                $this->error("Failed to queue post #{$post->id}: {$e->getMessage()}");

                Log::error('Failed to queue post for prompt stats', [
                    'post_id' => $post->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->newLine(2);
        $this->info('Post prompt stats fetch queued!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Posts Checked', $posts->count()],
                ['Jobs Queued', $queuedCount],
                ['Posts Skipped (trial expired)', $skippedCount],
            ]
        );

        if ($queuedCount > 0) {
            $this->info('Monitor progress with: php artisan queue:work');
        }

        return self::SUCCESS;
    }
}
