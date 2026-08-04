<?php

namespace App\Console\Commands;

use App\Jobs\CheckPostCitationsJob;
use App\Models\Post;
use Illuminate\Console\Command;

class CheckDailyCitationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'citations:check-daily 
        {--post= : The ID of a specific post to check}
        {--brand= : The ID of a specific brand to check posts for}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch job to check citations for all posts daily';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $postId = $this->option('post');
        $brandId = $this->option('brand');

        // Step 1: Determine which brands have an active subscription/trial
        // before fetching any posts.
        $eligibleBrandIds = \App\Models\Brand::where('status', 'active')
            ->pluck('id')
            ->toArray();

        $eligibleBrandIds = array_filter($eligibleBrandIds, function ($id) {
            $brand = \App\Models\Brand::find($id);
            if (! $brand) {
                return false;
            }
            $brandUser = \App\Models\User::find($brand->user_id ?? $brand->agency_id);

            return ! $brandUser || $brandUser->canProcessAnalysis();
        });

        if (empty($eligibleBrandIds)) {
            $this->info('No eligible brands found (all inactive or expired subscriptions).');

            return;
        }

        $query = Post::where('status', 'published')
            ->whereIn('brand_id', $eligibleBrandIds);

        if ($postId) {
            $this->info("Checking citations for specific post ID: {$postId}");
            $query->where('id', $postId);
        }

        if ($brandId) {
            $this->info("Checking citations for specific brand ID: {$brandId}");
            $query->where('brand_id', $brandId);
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            if ($postId || $brandId) {
                $this->error('No valid published posts found matching your criteria.');
            } else {
                $this->info('No published posts found to process for eligible brands.');
            }

            return;
        }

        if (! $postId && ! $brandId) {
            $this->info('Starting the citations check dispatch for all active posts.');
        }

        $count = 0;
        $skippedOld = 0;
        $sevenDaysAgo = now()->subDays(7);

        foreach ($posts as $post) {

            // Skip posts where every prompt was checked within the last 7 days
            $selectedPrompts = $post->prompts()
                ->where('is_selected', true)
                ->pluck('prompt')
                ->toArray();

            if (! empty($selectedPrompts)) {
                $promptHashes = array_map('md5', $selectedPrompts);
                $providers    = ['openai', 'gemini', 'perplexity'];

                $totalChecksNeeded = count($selectedPrompts) * count($providers);

                $recentChecks = \App\Models\PostCitation::where('post_id', $post->id)
                    ->whereIn('prompt_hash', $promptHashes)
                    ->whereIn('ai_model', $providers)
                    ->where('checked_at', '>=', $sevenDaysAgo)
                    ->count();

                if ($recentChecks >= $totalChecksNeeded) {
                    $skippedOld++;
                    continue;
                }
            }

            CheckPostCitationsJob::dispatch($post);
            $count++;
        }

        $this->info("Dispatched {$count} citation check jobs successfully.");
        if ($skippedOld > 0) {
            $this->info("Skipped {$skippedOld} posts (all prompts checked within last 7 days).");
        }
    }
}
