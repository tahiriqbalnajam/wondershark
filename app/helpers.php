<?php

use App\Services\FeatureService;
use Illuminate\Support\Facades\Log;

if (! function_exists('url_exists')) {
    /**
     * Quick HEAD request to verify a URL is reachable (returns 2xx/3xx).
     * Skips check for major trusted domains to save time.
     * Results are cached in-memory for the duration of the request.
     */
    function url_exists(string $url): bool
    {
        static $cache = [];

        if (array_key_exists($url, $cache)) {
            return $cache[$url];
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (! $host) {
            return $cache[$url] = false;
        }

        $trustedDomains = [
            'reddit.com', 'redd.it',
            'youtube.com', 'youtu.be',
            'wikipedia.org',
            'github.com',
            'stackoverflow.com',
            'medium.com',
            'nytimes.com', 'wsj.com', 'washingtonpost.com',
            'reuters.com', 'bloomberg.com', 'apnews.com',
            'bbc.com', 'bbc.co.uk',
            'cnn.com', 'nbcnews.com', 'abcnews.go.com',
            'theguardian.com', 'economist.com', 'forbes.com',
            'techcrunch.com', 'theverge.com', 'wired.com',
            'arstechnica.com', 'zdnet.com',
            'harvard.edu', 'mit.edu', 'stanford.edu',
            'nature.com', 'science.org', 'ieee.org',
            'linkedin.com', 'twitter.com', 'x.com', 'facebook.com',
            'instagram.com', 'tiktok.com', 'pinterest.com',
        ];

        $hostLower = strtolower($host);
        foreach ($trustedDomains as $trusted) {
            if ($hostLower === $trusted || str_ends_with($hostLower, '.' . $trusted)) {
                return $cache[$url] = true;
            }
        }

        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_NOBODY => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; WonderShark/1.0)',
                CURLOPT_SSL_VERIFYPEER => true,
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $cache[$url] = ($httpCode >= 200 && $httpCode < 400);
        } catch (\Exception $e) {
            Log::warning('URL reachability check failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
            return $cache[$url] = true; // keep URL on network errors
        }
    }
}

if (! function_exists('feature')) {
    /**
     * Get the FeatureService instance.
     *
     * Usage:
     *   feature()->for($user)->can('competitor_analysis', $brand)
     *   feature()->for($user)->remaining('brands_covered')
     *   feature()->for($user)->incrementOrFail('competitor_analysis', $brand)
     *   feature()->plan()  // current user's plan
     */
    function feature(): FeatureService
    {
        return app(FeatureService::class);
    }
}
