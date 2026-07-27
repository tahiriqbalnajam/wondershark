<?php

namespace App\Console\Commands;

use App\Jobs\GenerateAdditionalPostPromptsJob;
use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateAdditionalPostPrompts extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'posts:generate-additional-prompts
                            {--post= : Specific post ID to process}
                            {--brand= : Specific brand ID to process}
                            {--all : Process all active posts across all brands}
                            {--target=10 : Target number of prompts per post}';

    /**
     * The console command description.
     */
    protected $description = 'Generate additional prompts for posts that have fewer than the target number';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $target = (int) $this->option('target');
        $postId = $this->option('post');
        $brandId = $this->option('brand');

        // Build query for published posts from active brands only
        $query = Post::with(['brand', 'prompts'])
            ->whereHas('brand', function ($q) {
                $q->where('status', 'active');
            })
            ->where('status', 'published');

        if ($postId) {
            $query->where('id', $postId);
            $this->info("Processing specific post ID: {$postId}");
        } elseif ($brandId) {
            $query->where('brand_id', $brandId);
            $this->info("Processing posts for brand ID: {$brandId}");
        } else {
            $this->info('Processing all published posts from active brands');
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            $this->warn('No posts found to process');

            return self::SUCCESS;
        }

        $this->info("Found {$posts->count()} post(s) to check");

        $queuedCount = 0;
        $skippedCount = 0;

        $sessionId = Str::uuid()->toString();

        foreach ($posts as $post) {
            $currentCount = $post->prompts->count();

            // Check if post title already exists as a prompt via DB query (more reliable than collection check)
            $titlePromptExists = false;
            if (! empty($post->title)) {
                $existingTitlePrompt = \App\Models\PostPrompt::forPost($post->id)
                    ->whereRaw('LOWER(prompt) = ?', [strtolower(trim($post->title))])
                    ->first();
                $titlePromptExists = $existingTitlePrompt !== null;
            }

            $needsTitle = ! empty($post->title) && ! $titlePromptExists;
            $aiNeeded = max(0, $target - $currentCount - ($needsTitle ? 1 : 0));

            if ($aiNeeded <= 0 && ! $needsTitle) {
                $this->line("  Post #{$post->id} already has {$currentCount} prompts. Skipping.");
                $skippedCount++;
                continue;
            }

            $totalToCreate = $aiNeeded + ($needsTitle ? 1 : 0);
            $this->info("  Post #{$post->id} has {$currentCount} prompts, queuing job to generate {$totalToCreate} more...");

            GenerateAdditionalPostPromptsJob::dispatch($post, $target, $sessionId)
                ->onQueue('default');

            $queuedCount++;
        }

        $this->newLine(2);
        $this->info('Additional prompt generation queued!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Posts Checked', $posts->count()],
                ['Jobs Queued', $queuedCount],
                ['Posts Skipped (already at target)', $skippedCount],
            ]
        );

        if ($queuedCount > 0) {
            $this->info("Session ID: {$sessionId}");
            $this->info('Monitor progress with: php artisan queue:work');
        }

        return self::SUCCESS;
    }
}
