<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\CitationCheckService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class CheckPostCitationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     * Set to 1 because each job runs multiple slow API calls.
     * Retrying would cause duplicate citation records.
     */
    public int $tries = 1;

    /**
     * Timeout in seconds (30 minutes).
     * Each post can have many prompts, each requiring a live API call.
     */
    public int $timeout = 1800;

    /**
     * Delete the job if the post model no longer exists.
     */
    public bool $deleteWhenMissingModels = true;

    protected Post $post;

    public function __construct(Post $post)
    {
        $this->post = $post;
    }

    public function handle(CitationCheckService $service): void
    {
        Log::info('Checking citations via queued job', ['post_id' => $this->post->id]);
        $service->runCitationCheck($this->post);
    }

    /**
     * Handle a job failure — log it cleanly instead of bubbling up an error.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('Citation check job permanently failed', [
            'post_id' => $this->post->id,
            'error'   => $exception->getMessage(),
        ]);
    }
}
