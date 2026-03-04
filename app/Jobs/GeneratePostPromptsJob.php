<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\PostPromptService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GeneratePostPromptsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Post $post;

    public function __construct(Post $post)
    {
        $this->post = $post;
    }

    public function handle(PostPromptService $service)
    {
        try {
            Log::info('Generating prompts via queued job', ['post_id' => $this->post->id]);
            
            // Generate prompts. Service handles the limit of 5.
            $service->generatePromptsFromMultipleModelsForPost(
                $this->post,
                'job-' . uniqid(),
                $this->post->description ?? ''
            );
            
            // Trigger citation check for this newly prepared post
            CheckPostCitationsJob::dispatch($this->post);
        } catch (\Exception $e) {
            Log::error('Job failed to generate prompts', [
                'post_id' => $this->post->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
