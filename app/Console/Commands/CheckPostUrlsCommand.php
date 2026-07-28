<?php

namespace App\Console\Commands;

use App\Jobs\CheckPostUrlsJob;
use App\Models\Post;
use Illuminate\Console\Command;

class CheckPostUrlsCommand extends Command
{
    protected $signature = 'posts:check-urls
        {--post= : The ID of a specific post to check}
        {--brand= : The ID of a specific brand to check posts for}
        {--all-brands : Check posts for all active brands}';

    protected $description = 'Dispatch queue jobs to check if published post URLs are still live and mark removed posts';

    public function handle(): int
    {
        $postId = $this->option('post');
        $brandId = $this->option('brand');
        $allBrands = $this->option('all-brands');

        $query = Post::where('status', 'published')
            ->whereHas('brand', function ($q) {
                $q->where('status', 'active');
            });

        if ($postId) {
            $query->where('id', $postId);
        }

        if ($brandId && ! $allBrands) {
            $query->where('brand_id', $brandId);
        }

        $posts = $query->get();

        if ($posts->isEmpty()) {
            $this->info('No published posts to check.');

            return 0;
        }

        $this->info("Dispatching URL-check jobs for {$posts->count()} post(s)...");

        $queuedCount = 0;

        foreach ($posts as $post) {
            CheckPostUrlsJob::dispatch($post->id)->onQueue('default');
            $this->line("  Queued URL check for post #{$post->id}");
            $queuedCount++;
        }

        $this->newLine(2);
        $this->info("Queued {$queuedCount} URL-check job(s).");
        $this->info('Process them with: php artisan queue:work --queue=default');

        return 0;
    }
}