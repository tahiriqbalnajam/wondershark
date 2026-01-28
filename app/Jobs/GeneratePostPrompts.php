<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\PostPromptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GeneratePostPrompts implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300; // 5 minutes timeout

    public int $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Post $post,
        public string $sessionId,
        public string $description = '',
        public bool $replaceExisting = false
    ) {}

    /**
     * Execute the job.
     */
    public function handle(PostPromptService $postPromptService): void
    {
        try {
            Log::info('Starting prompt generation for post', [
                'post_id' => $this->post->id,
                'post_url' => $this->post->url,
                'replace_existing' => $this->replaceExisting,
            ]);

            // Delete existing prompts if requested
            if ($this->replaceExisting) {
                $this->post->prompts()->delete();
                Log::info('Deleted existing prompts for post', ['post_id' => $this->post->id]);
            }

            // Generate prompts from all enabled AI models
            $prompts = $postPromptService->generatePromptsFromMultipleModelsForPost(
                $this->post,
                $this->sessionId,
                $this->description
            );

            Log::info('Successfully generated prompts for post', [
                'post_id' => $this->post->id,
                'prompts_generated' => count($prompts),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate prompts for post in job', [
                'post_id' => $this->post->id,
                'post_url' => $this->post->url,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw the exception so the job can be retried
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('GeneratePostPrompts job failed permanently', [
            'post_id' => $this->post->id,
            'post_url' => $this->post->url,
            'error' => $exception->getMessage(),
        ]);
    }
}
