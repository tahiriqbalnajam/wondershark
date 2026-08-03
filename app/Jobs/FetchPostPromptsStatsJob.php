<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\PostPromptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class FetchPostPromptsStatsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 1;

    public function __construct(
        public Post $post,
    ) {}

    public function handle(PostPromptService $postPromptService): void
    {
        $post = $this->post->load(['prompts', 'brand']);

        try {
            // Skip if the brand owner's trial has expired and they have no active subscription
            $brandUser = \App\Models\User::find($post->brand->user_id ?? $post->brand->agency_id);
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                Log::info('Skipping post prompt stats fetch — trial expired, no active subscription', [
                    'post_id' => $post->id,
                    'brand_id' => $post->brand_id,
                    'user_id' => $brandUser->id,
                ]);

                return;
            }

            $prompts = $post->prompts;

            if ($prompts->isEmpty()) {
                Log::info("Post #{$post->id} has no prompts — skipping stats fetch", [
                    'post_id' => $post->id,
                ]);

                return;
            }

            $promptsProcessed = 0;
            $errorCount = 0;

            foreach ($prompts as $prompt) {
                try {
                    // Analyze and update stats for this prompt
                    $stats = $postPromptService->analyzePromptStatsWithAI($prompt, $post);

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

            Log::info("Post #{$post->id} prompt stats fetch completed", [
                'post_id' => $post->id,
                'prompts_processed' => $promptsProcessed,
                'errors' => $errorCount,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to process post for prompt stats', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('FetchPostPromptsStatsJob failed permanently', [
            'post_id' => $this->post->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
