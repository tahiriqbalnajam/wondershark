<?php

namespace App\Services;

use App\Models\Competitor;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CompetitorStatsService
{
    private $statsExtractor;

    public function __construct()
    {
        // You can inject different extractors based on API providers
        $this->statsExtractor = new CompetitorStatsExtractor;
    }

    /**
     * Update stats for a single competitor
     */
    public function updateCompetitorStats(Competitor $competitor): bool
    {
        try {
            // Example: Fetch stats from multiple sources
            $stats = $this->fetchStatsFromAPIs($competitor);

            // Update competitor with new stats
            $competitor->update([
                'rank' => $stats['rank'],
                'visibility' => $stats['visibility'],
                'sentiment' => $stats['sentiment'],
                'traffic_estimate' => $stats['traffic_estimate'] ?? null,
                'market_share' => $stats['market_share'] ?? null,
                'social_metrics' => $stats['social_metrics'] ?? null,
                'stats_updated_at' => now(),
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to update stats for competitor {$competitor->id}: ".$e->getMessage());

            return false;
        }
    }

    /**
     * Update stats for all competitors of a brand
     */
    public function updateBrandCompetitorStats($brandId): array
    {
        $competitors = Competitor::where('brand_id', $brandId)->get();
        $results = ['success' => 0, 'failed' => 0];

        foreach ($competitors as $competitor) {
            if ($this->updateCompetitorStats($competitor)) {
                $results['success']++;
            } else {
                $results['failed']++;
            }
        }

        return $results;
    }

    /**
     * Fetch stats from multiple API sources
     */
    private function fetchStatsFromAPIs(Competitor $competitor): array
    {
        $stats = [
            'rank' => null,
            'visibility' => null,
            'sentiment' => null,
            'traffic_estimate' => null,
            'market_share' => null,
            'social_metrics' => null,
        ];

        // Example API calls (replace with actual APIs)

        // 1. SEO/Ranking APIs (SemRush, Ahrefs, etc.)
        $seoStats = $this->fetchSEOStats($competitor);
        if ($seoStats) {
            $stats['rank'] = $seoStats['rank'] ?? $stats['rank'];
            $stats['visibility'] = $seoStats['visibility'] ?? $stats['visibility'];
            $stats['traffic_estimate'] = $seoStats['traffic'] ?? $stats['traffic_estimate'];
        }

        // 2. Social Sentiment APIs (Brandwatch, Mention, etc.)
        $sentimentStats = $this->fetchSentimentStats($competitor);
        if ($sentimentStats) {
            $stats['sentiment'] = $sentimentStats['sentiment'] ?? $stats['sentiment'];
            $stats['social_metrics'] = $sentimentStats['social_metrics'] ?? $stats['social_metrics'];
        }

        // 3. Market Research APIs (Crunchbase, Similar Web, etc.)
        $marketStats = $this->fetchMarketStats($competitor);
        if ($marketStats) {
            $stats['market_share'] = $marketStats['market_share'] ?? $stats['market_share'];
            $stats['rank'] = $marketStats['rank'] ?? $stats['rank'];
        }

        return $stats;
    }

    /**
     * Fetch SEO and ranking data
     */
    private function fetchSEOStats(Competitor $competitor): ?array
    {
        try {
            // Example: SemRush API call
            $response = Http::timeout(30)->get('https://api.semrush.com/analytics/v1/', [
                'type' => 'domain_overview',
                'key' => config('services.semrush.api_key'),
                'domain' => $competitor->domain,
                'database' => 'us',
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return $this->statsExtractor->extractStats(json_encode($data), $competitor->name);
            }

        } catch (\Exception $e) {
            Log::warning("SEO stats fetch failed for {$competitor->domain}: ".$e->getMessage());
        }

        return null;
    }

    /**
     * Fetch sentiment and social data
     */
    private function fetchSentimentStats(Competitor $competitor): ?array
    {
        try {
            // Example: Brandwatch or Mention API
            $response = Http::timeout(30)
                ->withToken(config('services.brandwatch.api_key'))
                ->get('https://api.brandwatch.com/projects/123/mentions', [
                    'queryId' => 'competitor_mentions',
                    'brands' => $competitor->name,
                ]);

            if ($response->successful()) {
                $data = $response->json();

                return $this->statsExtractor->extractStats(json_encode($data), $competitor->name);
            }

        } catch (\Exception $e) {
            Log::warning("Sentiment stats fetch failed for {$competitor->name}: ".$e->getMessage());
        }

        return null;
    }

    /**
     * Fetch market and competitive data
     */
    private function fetchMarketStats(Competitor $competitor): ?array
    {
        try {
            // Example: SimilarWeb API
            $response = Http::timeout(30)
                ->withToken(config('services.similarweb.api_key'))
                ->get("https://api.similarweb.com/v1/website/{$competitor->domain}/total-traffic-and-engagement/visits", [
                    'start_date' => now()->subMonths(3)->format('Y-m'),
                    'end_date' => now()->format('Y-m'),
                    'country' => 'US',
                    'granularity' => 'monthly',
                ]);

            if ($response->successful()) {
                $data = $response->json();

                return $this->statsExtractor->extractStats(json_encode($data), $competitor->name);
            }

        } catch (\Exception $e) {
            Log::warning("Market stats fetch failed for {$competitor->domain}: ".$e->getMessage());
        }

        return null;
    }
}

class CompetitorStatsExtractor
{
    private $currentCompetitorName;

    public function __construct($competitorName = null)
    {
        $this->currentCompetitorName = $competitorName;
    }

    public function extractStats($jsonResponse, $competitorName = null): array
    {
        $data = json_decode($jsonResponse, true);

        if ($competitorName) {
            $this->currentCompetitorName = $competitorName;
        }

        return [
            'rank' => $this->extractRank($data),
            'visibility' => $this->extractVisibility($data),
            'sentiment' => $this->extractSentiment($data),
            'traffic_estimate' => $this->extractTrafficEstimate($data),
            'market_share' => $this->extractMarketShare($data),
            'social_metrics' => $this->extractSocialMetrics($data),
        ];
    }

    private function extractRank($data): ?int
    {
        // Multiple patterns for rank extraction
        return $data['rank']
            ?? $data['seo']['rank']
            ?? $data['search_rank']
            ?? $data['market_position']
            ?? $data['position']
            ?? $data['competitive_analysis']['ranking']
            ?? null;
    }

    private function extractVisibility($data): ?float
    {
        // Multiple patterns for visibility extraction
        return $data['visibility']
            ?? $data['online_presence']['visibility_score']
            ?? $data['search_visibility']
            ?? $data['seo']['visibility']
            ?? $data['brand_awareness']
            ?? $data['awareness_score']
            ?? null;
    }

    private function extractSentiment($data): ?float
    {
        // Multiple patterns for sentiment extraction
        return $data['sentiment']
            ?? $data['sentiment_analysis']['score']
            ?? $data['reviews']['sentiment']
            ?? $data['social_sentiment']
            ?? $data['brand_perception']
            ?? $this->calculateSentimentFromMentions($data)
            ?? null;
    }

    private function extractTrafficEstimate($data): ?int
    {
        return $data['traffic']['estimated_visits']
            ?? $data['monthly_visits']
            ?? $data['visits']
            ?? $data['traffic_estimate']
            ?? null;
    }

    private function extractMarketShare($data): ?float
    {
        return $data['market_share']
            ?? $data['competitive_analysis']['market_share']
            ?? $data['share_of_voice']
            ?? null;
    }

    private function extractSocialMetrics($data): ?array
    {
        $socialData = $data['social_metrics']
            ?? $data['social']
            ?? $data['social_media']
            ?? null;

        if ($socialData) {
            return [
                'followers' => $socialData['followers'] ?? null,
                'engagement_rate' => $socialData['engagement_rate'] ?? null,
                'mentions' => $socialData['mentions'] ?? null,
                'reach' => $socialData['reach'] ?? null,
            ];
        }

        return null;
    }

    private function calculateSentimentFromMentions($data): ?float
    {
        if (isset($data['mentions'])) {
            $positive = $data['mentions']['positive'] ?? 0;
            $negative = $data['mentions']['negative'] ?? 0;
            $neutral = $data['mentions']['neutral'] ?? 0;
            $total = $positive + $negative + $neutral;

            if ($total > 0) {
                return round(($positive - $negative) / $total * 100, 2);
            }
        }

        return null;
    }
}
