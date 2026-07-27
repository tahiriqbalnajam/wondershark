<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RedditApiService
{
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        $this->clientId = config('services.reddit.client_id', env('REDDIT_CLIENT_ID', ''));
        $this->clientSecret = config('services.reddit.client_secret', env('REDDIT_CLIENT_SECRET', ''));
    }

    public function isPostRemoved(string $url): ?array
    {
        if (empty($this->clientId) || empty($this->clientSecret)) {
            return null;
        }

        $jsonUrl = $this->buildJsonUrl($url);
        if (! $jsonUrl) {
            return null;
        }

        $token = $this->getAccessToken();
        if (! $token) {
            return null;
        }

        try {
            $response = Http::timeout(10)
                ->withToken($token, 'bearer')
                ->withHeaders([
                    'User-Agent' => 'wondershark/1.0 by /u/wondershark',
                ])
                ->get($jsonUrl);

            if (! $response->ok()) {
                Log::warning('Reddit API returned non-OK status', [
                    'url' => $jsonUrl,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $data = $response->json();
            $post = $data[0]['data']['children'][0]['data'] ?? null;

            if (! $post) {
                return null;
            }

            // removed_by_category indicates removal:
            // null = not removed, "moderator" = mod removed, "reddit" = admin removed,
            // "author" = author removed, "legal" = legal removal, "copyright_takedown", "automod_filtered", etc.
            $removedCategory = $post['removed_by_category'] ?? null;

            if ($removedCategory !== null) {
                return [
                    'removed' => true,
                    'live' => false,
                    'reason' => "Reddit API: removed_by_category = {$removedCategory}",
                ];
            }

            // Also check if selftext is [removed] or [deleted]
            $selftext = $post['selftext'] ?? '';
            if (str_contains($selftext, '[removed]') || str_contains($selftext, '[deleted]')) {
                return [
                    'removed' => true,
                    'live' => false,
                    'reason' => "Reddit API: selftext contains removal marker",
                ];
            }

            return [
                'removed' => false,
                'live' => true,
                'reason' => 'Reddit API: post is live',
            ];
        } catch (\Exception $e) {
            Log::warning('Reddit API check failed', [
                'url' => $jsonUrl,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function getAccessToken(): ?string
    {
        return Cache::remember('reddit_access_token', 3300, function () {
            try {
                $response = Http::timeout(10)
                    ->withBasicAuth($this->clientId, $this->clientSecret)
                    ->asForm()
                    ->post('https://www.reddit.com/api/v1/access_token', [
                        'grant_type' => 'client_credentials',
                    ]);

                if (! $response->ok()) {
                    Log::warning('Reddit OAuth token request failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return null;
                }

                $data = $response->json();
                $token = $data['access_token'] ?? null;

                if (! $token) {
                    Log::warning('Reddit OAuth token missing from response');
                }

                return $token;
            } catch (\Exception $e) {
                Log::warning('Reddit OAuth token request exception', [
                    'error' => $e->getMessage(),
                ]);

                return null;
            }
        });
    }

    /**
     * Convert a Reddit post URL to its JSON API equivalent.
     */
    private function buildJsonUrl(string $url): ?string
    {
        // Normalize URL
        $url = preg_replace('#^https?://(www\.)?reddit\.com#i', 'https://www.reddit.com', $url);

        // Handle short links (/s/...) — can't use JSON API on these directly
        if (str_contains(strtolower($url), '/s/')) {
            // Resolve short link to actual post URL first
            $resolved = $this->resolveShortLink($url);
            if (! $resolved) {
                return null;
            }
            $url = $resolved;
        }

        // Only handle /comments/ URLs
        if (! preg_match('#reddit\.com/r/([^/]+)/comments/([^/]+)#i', $url, $matches)) {
            return null;
        }

        $subreddit = $matches[1];
        $postId = $matches[2];

        // Use oauth.reddit.com for authenticated requests
        return "https://oauth.reddit.com/r/{$subreddit}/comments/{$postId}.json";
    }

    private function resolveShortLink(string $url): ?string
    {
        try {
            $response = Http::timeout(10)
                ->withOptions([
                    'allow_redirects' => ['max' => 5, 'strict' => false],
                    'verify' => false,
                ])
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url);

            $effectiveUrl = $response->handlerStats()['effective_url'] ?? null;

            return $effectiveUrl ?: null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
