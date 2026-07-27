<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\RedditApiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckPostUrlsCommand extends Command
{
    protected $signature = 'posts:check-urls
        {--post= : The ID of a specific post to check}
        {--brand= : The ID of a specific brand to check posts for}
        {--all-brands : Check posts for all active brands}';

    protected $description = 'Check if published post URLs are still live and mark removed posts';

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

        $this->info("Checking URLs for {$posts->count()} post(s)...");

        $removedCount = 0;
        $checkedCount = 0;

        foreach ($posts as $post) {
            $checkedCount++;
            $result = $this->checkUrl($post->url);

            if ($result['removed']) {
                $post->update(['status' => 'removed']);

                Log::info('Post marked as removed due to URL check', [
                    'post_id' => $post->id,
                    'url' => $post->url,
                    'reason' => $result['reason'],
                ]);

                $this->warn("Post {$post->id} marked as removed: {$result['reason']}");
                $removedCount++;
            } else {
                if (! $result['live']) {
                    $this->line("Post {$post->id} skipped (ambiguous): {$result['reason']}");
                } else {
                    $this->info("Post {$post->id} OK");
                }
            }

            // Small delay to avoid hammering external sites
            if ($checkedCount < $posts->count()) {
                usleep(250000); // 250ms
            }
        }

        $this->info("Finished. Checked {$checkedCount}, marked removed: {$removedCount}.");

        return 0;
    }

    private function resolveRedditShortLink(string $url): string
    {
        if (! str_contains(strtolower($url), 'reddit.com') || ! str_contains(strtolower($url), '/s/')) {
            return $url;
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_COOKIE, 'over18=1');
        curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request

        curl_exec($ch);
        $resolved = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);

        return $resolved ?: $url;
    }

    private function checkUrl(string $url): array
    {
        // Resolve Reddit short links to actual post URLs
        $url = $this->resolveRedditShortLink($url);

        // For Reddit URLs, try the official API first
        if (str_contains(strtolower($url), 'reddit.com')) {
            $redditResult = app(RedditApiService::class)->isPostRemoved($url);
            if ($redditResult !== null) {
                return $redditResult;
            }
            // Fall through to HTML scraping if API fails
        }

        try {
            $response = Http::timeout(10)
                ->withOptions([
                    'allow_redirects' => ['max' => 5, 'strict' => false],
                    'verify' => false,
                ])
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                ])
                ->head($url);

            $status = $response->status();

            // Definitively removed
            if ($status === 404 || $status === 410) {
                return ['removed' => true, 'live' => false, 'reason' => "HTTP {$status}"];
            }

            // Ambiguous — do not mark as removed
            if ($status >= 500 || $status === 403 || $status === 401 || $status === 429) {
                return ['removed' => false, 'live' => false, 'reason' => "HTTP {$status} (ambiguous)"];
            }

            // For 200 responses, also verify the body isn't a soft-deletion page
            // (Reddit, forums, etc. return 200 with "this post was deleted" in the body)
            if ($response->ok() || $status === 405) {
                // Reddit blocks programmatic requests on www.reddit.com; use old.reddit.com instead
                $checkUrl = $url;
                if (str_contains(strtolower($url), 'reddit.com') && ! str_contains(strtolower($url), 'old.reddit.com')) {
                    $checkUrl = preg_replace('#^https?://(www\.)?reddit\.com#i', 'https://old.reddit.com', $url);
                }

                $getResponse = Http::timeout(10)
                    ->withOptions([
                        'allow_redirects' => ['max' => 5, 'strict' => false],
                        'verify' => false,
                    ])
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                        'Cookie' => 'over18=1',
                    ])
                    ->get($checkUrl);

                $getStatus = $getResponse->status();

                if ($getStatus === 404 || $getStatus === 410) {
                    return ['removed' => true, 'live' => false, 'reason' => "HTTP {$getStatus}"];
                }

                if ($getResponse->ok()) {
                    $html = substr($getResponse->body(), 0, 50000);
                    // Strip HTML tags and normalize whitespace so keywords match across tag boundaries
                    $body = strtolower(preg_replace('/\s+/', ' ', strip_tags($html)));
                    $removalKeywords = [
                        'post was removed',
                        'post was deleted',
                        'this post was deleted',
                        'this post was removed',
                        'deleted by the person',
                        'removed by the moderators',
                        'removed by reddit',
                        'removed by the moderators of',
                        'page not found',
                        'content not found',
                        'this content is no longer available',
                        'the page you requested does not exist',
                        '404 - not found',
                        'error 404',
                        'sorry, this post was deleted',
                        'sorry, this post was removed',
                        '[removed]',
                        '[deleted]',
                        'deleted link self',
                        'deleted link',
                    ];

                    foreach ($removalKeywords as $keyword) {
                        if (str_contains($body, $keyword)) {
                            return ['removed' => true, 'live' => false, 'reason' => "Body contains: {$keyword}"];
                        }
                    }
                }
            }

            return ['removed' => false, 'live' => true, 'reason' => "HTTP {$status}"];
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return ['removed' => true, 'live' => false, 'reason' => 'Connection/DNS failure'];
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $status = $e->response ? $e->response->status() : 0;

            if ($status === 404 || $status === 410) {
                return ['removed' => true, 'live' => false, 'reason' => "HTTP {$status}"];
            }

            return ['removed' => false, 'live' => false, 'reason' => "Request exception (HTTP {$status})"];
        } catch (\Exception $e) {
            return ['removed' => false, 'live' => false, 'reason' => $e->getMessage()];
        }
    }
}
