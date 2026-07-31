<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\PostPrompt;
use Illuminate\Console\Command;

class RemoveAdditionalPostPrompts extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'posts:remove-additional-prompts
                            {--post= : Specific post ID to process}
                            {--brand= : Specific brand ID to process}
                            {--keep=5 : Number of prompts to keep per post}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Trim post prompts to keep only the first N prompts, deleting the rest';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $keep = (int) $this->option('keep');
        $postId = $this->option('post');
        $brandId = $this->option('brand');
        $dryRun = $this->option('dry-run');

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
        $this->newLine();

        $trimmedCount = 0;
        $skippedCount = 0;
        $totalDeleted = 0;

        foreach ($posts as $post) {
            $currentCount = $post->prompts->count();

            if ($currentCount <= $keep) {
                $this->line("  Post #{$post->id}: has {$currentCount} prompts (≤ {$keep}). Skipping.");
                $skippedCount++;
                continue;
            }

            $toDelete = $currentCount - $keep;
            $this->info("  Post #{$post->id}: has {$currentCount} prompts. Trimming to {$keep} (deleting {$toDelete})...");

            // Get prompts ordered by 'order' ascending, skip first $keep
            $promptsToDelete = PostPrompt::forPost($post->id)
                ->orderBy('order', 'asc')
                ->skip($keep)
                ->take($toDelete)
                ->get();

            if ($dryRun) {
                foreach ($promptsToDelete as $prompt) {
                    $this->line("    [DRY-RUN] Would delete: {$prompt->prompt}");
                }
                $totalDeleted += $promptsToDelete->count();
                $trimmedCount++;
                continue;
            }

            // Delete the extra prompts
            $deletedIds = $promptsToDelete->pluck('id')->toArray();
            PostPrompt::whereIn('id', $deletedIds)->delete();

            $totalDeleted += count($deletedIds);
            $trimmedCount++;

            $this->info("    -> Deleted {$toDelete} extra prompt(s) for post #{$post->id}");
        }

        $this->newLine(2);

        if ($dryRun) {
            $this->warn('DRY-RUN mode — no prompts were actually deleted.');
        }

        $this->info('Prompt trimming complete!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Posts Checked', $posts->count()],
                ['Posts Trimmed', $trimmedCount],
                ['Posts Skipped (already ≤ target)', $skippedCount],
                ['Total Prompts Deleted', $totalDeleted],
            ]
        );

        return self::SUCCESS;
    }
}
