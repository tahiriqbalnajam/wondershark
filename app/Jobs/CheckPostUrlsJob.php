<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\PostUrlCheckService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CheckPostUrlsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 60;

    public int $tries = 1;

    public function __construct(
        public int $postId,
    ) {}

    public function handle(PostUrlCheckService $service): void
    {
        $post = Post::find($this->postId);

        if (! $post) {
            Log::info('CheckPostUrlsJob skipped — post not found', ['post_id' => $this->postId]);

            return;
        }

        if ($post->status !== 'published') {
            Log::info('CheckPostUrlsJob skipped — post not published', [
                'post_id' => $post->id,
                'status' => $post->status,
            ]);

            return;
        }

        $result = $service->check($post);

        Log::info('CheckPostUrlsJob completed', [
            'post_id' => $post->id,
            'removed' => $result['removed'],
            'live' => $result['live'],
            'reason' => $result['reason'],
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('CheckPostUrlsJob failed', [
            'post_id' => $this->postId,
            'error' => $exception->getMessage(),
        ]);
    }
}