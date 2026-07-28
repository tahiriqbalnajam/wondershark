<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PostUrlCheckService
{
    public function check(Post $post): array
    {
        $result = $this->checkUrl($post->url);

        if ($result['removed']) {
            $post->update(['status' => 'removed']);

            Log::info('Post marked as removed due to URL check', [
                'post_id' => $post->id,
                'url' => $post->url,
                'reason' => $result['reason'],
            ]);
        }

        return $result;
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
        curl_setopt($ch, CURLOPT_NOBODY, true);

        curl_exec($ch);
        $resolved = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);

        return $resolved ?: $url;
    }

    private function checkUrl(string $url): array
    {
        $url = $this->resolveRedditShortLink($url);

        if (str_contains(strtolower($url), 'reddit.com')) {
            $redditResult = app(RedditApiService::class)->isPostRemoved($url);
            if ($redditResult !== null) {
                return $redditResult;
            }
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

            if ($status === 404 || $status === 410) {
                return ['removed' => true, 'live' => false, 'reason' => "HTTP {$status}"];
            }

            if ($status >= 500 || $status === 403 || $status === 401 || $status === 429) {
                return ['removed' => false, 'live' => false, 'reason' => "HTTP {$status} (ambiguous)"];
            }

            if ($response->ok() || $status === 405) {
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
        } catch (ConnectionException $e) {
            return ['removed' => true, 'live' => false, 'reason' => 'Connection/DNS failure'];
        } catch (RequestException $e) {
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