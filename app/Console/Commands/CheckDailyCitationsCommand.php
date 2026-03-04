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

        $query = Post::where('status', 'published');

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
                $this->error("No valid published posts found matching your criteria.");
            } else {
                $this->info("No published posts found to process.");
            }
            return;
        }

        if (!$postId && !$brandId) {
            $this->info("Starting the citations check dispatch for all active posts.");
        }

        $count = 0;
        foreach ($posts as $post) {
            CheckPostCitationsJob::dispatch($post);
            $count++;
        }

        $this->info("Dispatched {$count} citation check jobs successfully.");
    }
}
