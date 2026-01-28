<?php

namespace App\Services;

class SerpApiStatsExtractor
{
    /**
     * Extract competitor stats from SerpAPI Google search response
     */
    public static function extractStats(array $serpApiResponse): array
    {
        $stats = [
            'rank' => null,
            'visibility' => null,
            'sentiment' => null,
            'traffic_estimate' => null,
            'market_share' => null,
            'social_metrics' => [],
        ];

        // Extract basic search information
        $searchInfo = $serpApiResponse['search_information'] ?? [];
        $organicResults = $serpApiResponse['organic_results'] ?? [];
        $relatedQuestions = $serpApiResponse['related_questions'] ?? [];
        $relatedSearches = $serpApiResponse['related_searches'] ?? [];

        // 1. RANK ANALYSIS
        $stats['rank'] = self::calculateRankStats($organicResults, $searchInfo);

        // 2. VISIBILITY ANALYSIS
        $stats['visibility'] = self::calculateVisibilityStats($organicResults, $relatedQuestions, $relatedSearches);

        // 3. SENTIMENT ANALYSIS
        $stats['sentiment'] = self::analyzeSentiment($organicResults, $relatedQuestions);

        // 4. TRAFFIC ESTIMATION
        $stats['traffic_estimate'] = self::estimateTraffic($organicResults, $searchInfo);

        // 5. MARKET SHARE INDICATORS
        $stats['market_share'] = self::calculateMarketShare($organicResults, $searchInfo);

        // 6. SOCIAL METRICS
        $stats['social_metrics'] = self::extractSocialMetrics($organicResults);

        return $stats;
    }

    /**
     * Calculate ranking statistics
     */
    private static function calculateRankStats(array $organicResults, array $searchInfo): array
    {
        $rankStats = [
            'primary_position' => null,
            'total_results' => $searchInfo['total_results'] ?? 0,
            'featured_snippet' => false,
            'sitelinks_count' => 0,
            'page_presence' => [],
        ];

        foreach ($organicResults as $result) {
            $position = $result['position'] ?? null;
            $link = $result['link'] ?? '';
            $title = $result['title'] ?? '';

            // Extract domain from link
            $domain = parse_url($link, PHP_URL_HOST);

            if ($position && $domain) {
                if (! $rankStats['primary_position']) {
                    $rankStats['primary_position'] = $position;
                }

                $rankStats['page_presence'][] = [
                    'position' => $position,
                    'domain' => $domain,
                    'title' => $title,
                    'has_sitelinks' => isset($result['sitelinks']),
                ];

                // Count sitelinks for expanded presence
                if (isset($result['sitelinks']['expanded'])) {
                    $rankStats['sitelinks_count'] = count($result['sitelinks']['expanded']);
                }

                // Check for featured snippets
                if ($position == 1 && isset($result['snippet'])) {
                    $rankStats['featured_snippet'] = true;
                }
            }
        }

        return $rankStats;
    }

    /**
     * Calculate visibility metrics
     */
    private static function calculateVisibilityStats(array $organicResults, array $relatedQuestions, array $relatedSearches): array
    {
        $visibilityStats = [
            'search_presence_score' => 0,
            'brand_mentions' => 0,
            'related_questions_mentions' => 0,
            'related_searches_count' => count($relatedSearches),
            'snippet_visibility' => [],
        ];

        // Calculate search presence score based on positions and features
        $totalScore = 0;
        foreach ($organicResults as $result) {
            $position = $result['position'] ?? 999;
            $baseScore = max(0, 100 - ($position - 1) * 10); // Higher score for better positions

            // Bonus for special features
            if (isset($result['sitelinks'])) {
                $baseScore += 20;
            }
            if (isset($result['snippet_highlighted_words'])) {
                $baseScore += 10;
            }

            $totalScore += $baseScore;

            $visibilityStats['snippet_visibility'][] = [
                'position' => $position,
                'snippet' => $result['snippet'] ?? '',
                'highlighted_words' => $result['snippet_highlighted_words'] ?? [],
                'score' => $baseScore,
            ];
        }

        $visibilityStats['search_presence_score'] = min(100, $totalScore);

        // Count brand mentions in related questions
        foreach ($relatedQuestions as $question) {
            $snippet = strtolower($question['snippet'] ?? '');
            $title = strtolower($question['title'] ?? '');

            // Look for brand mentions (you can customize this logic)
            if (strpos($snippet, 'poptribe') !== false || strpos($title, 'poptribe') !== false) {
                $visibilityStats['related_questions_mentions']++;
            }
        }

        return $visibilityStats;
    }

    /**
     * Analyze sentiment from search results
     */
    private static function analyzeSentiment(array $organicResults, array $relatedQuestions): array
    {
        $sentimentStats = [
            'overall_sentiment' => 'neutral',
            'positive_indicators' => 0,
            'negative_indicators' => 0,
            'neutral_indicators' => 0,
            'sentiment_keywords' => [],
        ];

        // Define sentiment keywords
        $positiveKeywords = [
            'cutting-edge', 'amazing', 'seamlessly', 'effortlessly', 'best', 'top',
            'leading', 'innovative', 'excellent', 'great', 'awesome', 'fantastic',
            'connects', 'boost', 'helps', 'successful', 'platform',
        ];

        $negativeKeywords = [
            'complaints', 'problems', 'issues', 'bad', 'worst', 'terrible',
            'scam', 'fraud', 'disappointing', 'failed', 'broken', 'useless',
        ];

        // Analyze organic results
        foreach ($organicResults as $result) {
            $text = strtolower(($result['snippet'] ?? '').' '.($result['title'] ?? ''));

            foreach ($positiveKeywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $sentimentStats['positive_indicators']++;
                    $sentimentStats['sentiment_keywords'][] = [
                        'keyword' => $keyword,
                        'type' => 'positive',
                        'source' => 'organic_result',
                        'position' => $result['position'] ?? null,
                    ];
                }
            }

            foreach ($negativeKeywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $sentimentStats['negative_indicators']++;
                    $sentimentStats['sentiment_keywords'][] = [
                        'keyword' => $keyword,
                        'type' => 'negative',
                        'source' => 'organic_result',
                        'position' => $result['position'] ?? null,
                    ];
                }
            }
        }

        // Analyze related questions
        foreach ($relatedQuestions as $question) {
            $text = strtolower(($question['snippet'] ?? '').' '.($question['question'] ?? ''));

            foreach ($positiveKeywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $sentimentStats['positive_indicators']++;
                    $sentimentStats['sentiment_keywords'][] = [
                        'keyword' => $keyword,
                        'type' => 'positive',
                        'source' => 'related_question',
                    ];
                }
            }

            foreach ($negativeKeywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    $sentimentStats['negative_indicators']++;
                    $sentimentStats['sentiment_keywords'][] = [
                        'keyword' => $keyword,
                        'type' => 'negative',
                        'source' => 'related_question',
                    ];
                }
            }
        }

        // Calculate overall sentiment
        $totalIndicators = $sentimentStats['positive_indicators'] + $sentimentStats['negative_indicators'];
        if ($totalIndicators > 0) {
            $positiveRatio = $sentimentStats['positive_indicators'] / $totalIndicators;
            if ($positiveRatio >= 0.7) {
                $sentimentStats['overall_sentiment'] = 'positive';
            } elseif ($positiveRatio <= 0.3) {
                $sentimentStats['overall_sentiment'] = 'negative';
            }
        }

        return $sentimentStats;
    }

    /**
     * Estimate traffic potential
     */
    private static function estimateTraffic(array $organicResults, array $searchInfo): array
    {
        $trafficStats = [
            'estimated_monthly_traffic' => 0,
            'click_potential' => 0,
            'search_volume_indicator' => $searchInfo['total_results'] ?? 0,
            'search_volume_category' => 'low',
        ];

        // Simple traffic estimation based on positions
        // These are rough estimates - you'd want to use actual keyword volume data
        $totalResults = $searchInfo['total_results'] ?? 0;

        // Estimate search volume category based on total results
        if ($totalResults > 1000000) {
            $baseTraffic = 50000; // High volume keyword
            $trafficStats['search_volume_category'] = 'high';
        } elseif ($totalResults > 100000) {
            $baseTraffic = 10000; // Medium volume
            $trafficStats['search_volume_category'] = 'medium';
        } elseif ($totalResults > 10000) {
            $baseTraffic = 2000; // Low-medium volume
            $trafficStats['search_volume_category'] = 'low-medium';
        } else {
            $baseTraffic = 500; // Low volume
            $trafficStats['search_volume_category'] = 'low';
        }

        // Calculate click potential based on positions
        foreach ($organicResults as $result) {
            $position = $result['position'] ?? 999;

            // CTR estimates based on position (industry averages)
            $ctrMultipliers = [
                1 => 0.28,  // Position 1 gets ~28% CTR
                2 => 0.15,  // Position 2 gets ~15% CTR
                3 => 0.11,  // Position 3 gets ~11% CTR
                4 => 0.08,
                5 => 0.06,
                6 => 0.05,
                7 => 0.04,
                8 => 0.03,
                9 => 0.03,
                10 => 0.02,
            ];

            $ctr = $ctrMultipliers[$position] ?? 0.01;
            $estimatedClicks = $baseTraffic * $ctr;

            $trafficStats['estimated_monthly_traffic'] += $estimatedClicks;
            $trafficStats['click_potential'] += $ctr * 100; // As percentage
        }

        return $trafficStats;
    }

    /**
     * Calculate market share indicators
     */
    private static function calculateMarketShare(array $organicResults, array $searchInfo): array
    {
        $marketStats = [
            'serp_dominance' => 0,
            'competitor_count' => count($organicResults),
            'market_position' => 'unknown',
            'domain_authority_indicators' => [],
        ];

        $totalPositions = count($organicResults);
        $topThreeCount = 0;
        $firstPageCount = 0;

        foreach ($organicResults as $result) {
            $position = $result['position'] ?? 999;
            $domain = parse_url($result['link'] ?? '', PHP_URL_HOST);

            if ($position <= 3) {
                $topThreeCount++;
            }
            if ($position <= 10) {
                $firstPageCount++;
            }

            // Domain authority indicators
            $authorityScore = 0;
            if (isset($result['sitelinks'])) {
                $authorityScore += 30; // Sitelinks indicate authority
            }
            if (isset($result['favicon'])) {
                $authorityScore += 10; // Favicon suggests established site
            }
            if ($position == 1) {
                $authorityScore += 40; // Top position indicates strong authority
            }

            $marketStats['domain_authority_indicators'][] = [
                'domain' => $domain,
                'position' => $position,
                'authority_score' => $authorityScore,
            ];
        }

        // Calculate SERP dominance
        if ($totalPositions > 0) {
            $marketStats['serp_dominance'] = ($firstPageCount / min(10, $totalPositions)) * 100;
        }

        // Determine market position
        if ($topThreeCount > 0) {
            $marketStats['market_position'] = 'leader';
        } elseif ($firstPageCount > 0) {
            $marketStats['market_position'] = 'competitor';
        } else {
            $marketStats['market_position'] = 'emerging';
        }

        return $marketStats;
    }

    /**
     * Extract social metrics from results
     */
    private static function extractSocialMetrics(array $organicResults): array
    {
        $socialStats = [
            'social_presence' => [],
            'follower_counts' => [],
            'platform_coverage' => 0,
            'total_followers' => 0,
        ];

        $socialPlatforms = ['instagram', 'twitter', 'x.com', 'linkedin', 'facebook', 'youtube', 'tiktok'];

        foreach ($organicResults as $result) {
            $link = strtolower($result['link'] ?? '');
            $title = strtolower($result['title'] ?? '');
            $displayedLink = strtolower($result['displayed_link'] ?? '');

            foreach ($socialPlatforms as $platform) {
                if (strpos($link, $platform) !== false || strpos($title, $platform) !== false) {
                    $followers = null;

                    // Extract follower count if available
                    if (preg_match('/(\d+)\+?\s*(followers?|following)/i', $displayedLink, $matches)) {
                        $followers = intval($matches[1]);
                    }

                    $socialStats['social_presence'][] = [
                        'platform' => $platform,
                        'url' => $result['link'] ?? '',
                        'followers' => $followers,
                        'position' => $result['position'] ?? null,
                    ];

                    if ($followers) {
                        $socialStats['follower_counts'][$platform] = $followers;
                        $socialStats['total_followers'] += $followers;
                    }
                }
            }
        }

        $socialStats['platform_coverage'] = count($socialStats['social_presence']);

        return $socialStats;
    }
}
