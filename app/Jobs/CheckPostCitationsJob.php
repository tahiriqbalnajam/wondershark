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

class CheckPostCitationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Post $post;

    public function __construct(Post $post)
    {
        $this->post = $post;
    }

    public function handle(CitationCheckService $service)
    {
        try {
            Log::info('Checking citations via queued job', ['post_id' => $this->post->id]);
            $service->runCitationCheck($this->post);
        } catch (\Exception $e) {
            Log::error('Citation check queued job failed', [
                'post_id' => $this->post->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
