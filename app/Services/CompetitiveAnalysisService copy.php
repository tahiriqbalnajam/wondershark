<?php

namespace App\Services;

use App\Models\AiModel;
use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Models\BrandMention;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CompetitiveAnalysisService
{
    protected $aiPromptService;

    public function __construct(AIPromptService $aiPromptService)
    {
        $this->aiPromptService = $aiPromptService;
    }

    /**
     * Analyze brand and its competitors for competitive metrics
     */
    public function analyzeBrandCompetitiveStats(Brand $brand, ?string $sessionId = null): array
    {
        $sessionId = $sessionId ?? Str::uuid();
        $results = [];

        try {
            // Check if brand has a website
            if (empty($brand->website)) {
                Log::warning("Brand {$brand->name} has no website - cannot perform competitive analysis");

                return [];
            }

            // Get accepted competitors with domains
            $competitors = $brand->competitors()->accepted()->whereNotNull('domain')->get();

            if ($competitors->isEmpty()) {
                Log::warning("No competitors with websites found for brand: {$brand->name}");

                return [];
            }

            // Create competitor URLs list for the prompt (add https:// to domains)
            $competitorUrls = $competitors->pluck('domain')->map(function ($domain) {
                return str_starts_with($domain, 'http') ? $domain : 'https://'.$domain;
            })->toArray();

            // Generate analysis prompt
            $prompt = $this->buildCompetitiveAnalysisPrompt($brand->website, $competitorUrls, $brand->name);

            // Get AI analysis with ai_model_id
            $aiResponse = $this->callAIForAnalysis($prompt);

            if (! $aiResponse || ! isset($aiResponse['analysis'])) {
                throw new \Exception('Failed to get AI analysis');
            }

            $analysis = $aiResponse['analysis'];
            $aiModelId = $aiResponse['ai_model_id'];

            // Parse and store brand stats
            $brandStats = $this->parseBrandStats($analysis, $brand, $sessionId, $aiModelId);
            if ($brandStats) {
                $results[] = $brandStats;
            }

            // Parse and store competitor stats
            foreach ($competitors as $competitor) {
                $competitorStats = $this->parseCompetitorStats($analysis, $brand, $competitor, $sessionId, $aiModelId);
                if ($competitorStats) {
                    $results[] = $competitorStats;
                }
            }

            Log::info("Competitive analysis completed for brand: {$brand->name}", [
                'session_id' => $sessionId,
                'results_count' => count($results),
            ]);

            return $results;

        } catch (\Exception $e) {
            Log::error("Competitive analysis failed for brand: {$brand->name}", [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
            ]);

            return [];
        }
    }

    /**
     * Build the competitive analysis prompt with updated requirements
     */
    protected function buildCompetitiveAnalysisPrompt(string $brandUrl, array $competitorUrls, string $brandName): string
    {
        $competitorUrlsString = implode(', ', $competitorUrls);

        return "You are an expert in competitive brand analysis. Given the brand website [{$brandUrl}] and its competitors [{$competitorUrlsString}], analyze each (brand first, then competitors) using real data from web searches and page browsing. Calibrate metrics to match benchmark data for the industry: visibility 30-50% (market share estimate), sentiment 70-80 (0-100 scale from review averages), position 1.0-3.0 (decimal ranking, lower=better leader).

Step 1: Gather Data
Use web research and analysis to collect information for each entity:
• Search for reviews and ratings to gather sentiment data (Amazon ratings, Reddit sentiment, review sites, customer feedback)
• Analyze each website URL to extract key features, user ratings, and competitive positioning
• Research market share data and competitive comparisons in the relevant industry
• Look for ranking lists, 'best of' articles, and sales data mentions

Step 2: Calculate Metrics
For each brand/competitor, compute these specific metrics based on the actual company and industry:

• Visibility (%): Market share estimate between 30-50% based on:
  - Percentage of top recommendations in comparison articles
  - Sales rank mentions and market share data
  - Search result prominence and brand recognition
  Formula: Average of market share estimates from multiple sources

• Sentiment (0-100): User satisfaction score based on:
  - Average review ratings scaled to 0-100 (e.g., 4.0/5 = 80)
  - Social media sentiment analysis
  - Customer testimonials and feedback
  - Return rates and satisfaction surveys if available

• Position (1.0-3.0): Competitive ranking where 1.0=market leader, 3.0=strong contender:
  - Based on comparison lists and industry rankings
  - Sales performance and market dominance
  - Innovation leadership and product quality recognition
  - Customer loyalty and brand strength

Step 3: Output Requirements
Return results in this exact JSON format. USE THE EXACT BRAND AND COMPETITOR NAMES FROM THE URLS PROVIDED - DO NOT ADD OR MODIFY THE NAMES:
{
  \"brand_analysis\": {
    \"name\": \"Exact Brand Name from Website\",
    \"url\": \"Brand URL\",
    \"visibility\": 42.5,
    \"sentiment\": 78,
    \"position\": 1.4,
    \"raw_data\": {
      \"review_sources\": [\"Amazon: 4.2/5 (1,234 reviews)\", \"Reddit: mostly positive\"],
      \"market_indicators\": [\"15% market share estimate\", \"#2 in category rankings\"],
      \"position_factors\": [\"Top 3 in comparison articles\", \"Best seller status\"]
    }
  },
  \"competitors_analysis\": [
    {
      \"name\": \"Exact Competitor Name from Website\",
      \"url\": \"Competitor URL\",
      \"visibility\": 35.2,
      \"sentiment\": 72,
      \"position\": 2.1,
      \"raw_data\": {
        \"review_sources\": [\"Amazon: 3.8/5 (892 reviews)\"],
        \"market_indicators\": [\"10% market share\"],
        \"position_factors\": [\"Top 5 recommended\"]
      }
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Extract the EXACT brand/company name from each website - do not add descriptive words or product categories
- For example: if the website is for 'Tesla', use 'Tesla' not 'Tesla Nasal Rinse' or 'Tesla Motors'
- Do not append product types or categories to company names
- Provide realistic metrics based on actual market research
- Ensure visibility scores are between 30-50%
- Sentiment scores should reflect real review averages (70-85 typical range)
- Position scores between 1.0-3.0 (lower numbers = better position)
- Include specific data sources in raw_data for transparency
- Base analysis on current market conditions and recent data";
    }

    /**
     * Call AI for competitive analysis using the AIPromptService
     */
    protected function callAIForAnalysis(string $prompt): ?array
    {
        try {
            // Get the first available AI model using weightage/order
            $aiModel = AiModel::where('is_enabled', true)
                ->orderBy('order', 'asc')
                ->orderBy('id', 'asc')
                ->first();

            if (! $aiModel) {
                throw new \Exception('No enabled AI model found');
            }

            Log::info('Using AI model for competitive analysis', [
                'model_name' => $aiModel->name,
                'display_name' => $aiModel->display_name,
                'order' => $aiModel->order,
                'ai_model_id' => $aiModel->id,
            ]);

            // Use a different approach - call the AI directly with a simple prompt
            $config = $aiModel->api_config;
            $apiKey = trim($config['api_key']);
            $model = $config['model'] ?? 'gpt-3.5-turbo';

            // Make direct API call for competitive analysis
            if ($aiModel->name === 'openai') {
                $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
                    ->timeout(120) // Longer timeout for complex analysis
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => $model,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                        'temperature' => 0.7,
                        'max_tokens' => 4000, // More tokens for detailed analysis
                    ]);

                if (! $response->successful()) {
                    throw new \Exception('OpenAI API error: '.$response->status().' - '.$response->body());
                }

                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';
            } else {
                throw new \Exception("Unsupported AI model for competitive analysis: {$aiModel->name}");
            }

            // Try to extract JSON from the response
            $jsonMatch = null;
            if (preg_match('/\{.*\}/s', $content, $matches)) {
                $jsonMatch = $matches[0];
            }

            if (! $jsonMatch) {
                // Try alternative JSON extraction patterns
                $patterns = [
                    '/```json\s*(\{.*?\})\s*```/s',
                    '/```\s*(\{.*?\})\s*```/s',
                    '/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/s',
                ];

                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $content, $matches)) {
                        $jsonMatch = $matches[1];
                        break;
                    }
                }
            }

            if (! $jsonMatch) {
                Log::error('No JSON found in AI response', ['response' => substr($content, 0, 500)]);
                throw new \Exception('No JSON found in AI response');
            }

            $analysis = json_decode($jsonMatch, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Invalid JSON in AI response', [
                    'error' => json_last_error_msg(),
                    'json' => substr($jsonMatch, 0, 500),
                ]);
                throw new \Exception('Invalid JSON in AI response: '.json_last_error_msg());
            }

            return [
                'analysis' => $analysis,
                'ai_model_id' => $aiModel->id,
            ];

        } catch (\Exception $e) {
            Log::error('AI competitive analysis failed', [
                'error' => $e->getMessage(),
                'prompt_length' => strlen($prompt),
            ]);

            return null;
        }
    }

    /**
     * Parse and store brand stats from AI analysis
     */
    protected function parseBrandStats(array $analysis, Brand $brand, string $sessionId, ?int $aiModelId = null): ?BrandCompetitiveStat
    {
        if (! isset($analysis['brand_analysis'])) {
            Log::warning('Brand analysis not found in AI response');

            return null;
        }

        $brandData = $analysis['brand_analysis'];

        return BrandCompetitiveStat::create([
            'brand_id' => $brand->id,
            'entity_type' => 'brand',
            'competitor_id' => null,
            'ai_model_id' => $aiModelId,
            'entity_name' => $brandData['name'] ?? $brand->name,
            'entity_url' => $brandData['url'] ?? $brand->website,
            'visibility' => $this->validateMetric($brandData['visibility'] ?? 0, 0, 100),
            'sentiment' => $this->validateMetric($brandData['sentiment'] ?? 0, 0, 100),
            'position' => $this->validateMetric($brandData['position'] ?? 5.0, 1.0, 10.0),
            'raw_data' => $brandData['raw_data'] ?? [],
            'analysis_session_id' => $sessionId,
            'analyzed_at' => now(),
        ]);
    }

    /**
     * Parse and store competitor stats from AI analysis
     */
    protected function parseCompetitorStats(array $analysis, Brand $brand, $competitor, string $sessionId, ?int $aiModelId = null): ?BrandCompetitiveStat
    {
        if (! isset($analysis['competitors_analysis']) || ! is_array($analysis['competitors_analysis'])) {
            Log::warning('Competitors analysis not found in AI response');

            return null;
        }

        // Find matching competitor in analysis by URL matching
        foreach ($analysis['competitors_analysis'] as $competitorData) {
            $competitorUrl = $competitorData['url'] ?? '';
            $competitorDomain = str_starts_with($competitor->domain, 'http') ? $competitor->domain : 'https://'.$competitor->domain;
            $competitorHost = parse_url($competitorDomain, PHP_URL_HOST);

            if ($competitorHost && str_contains($competitorUrl, $competitorHost)) {
                return BrandCompetitiveStat::create([
                    'brand_id' => $brand->id,
                    'entity_type' => 'competitor',
                    'competitor_id' => $competitor->id,
                    'ai_model_id' => $aiModelId,
                    'entity_name' => $competitorData['name'] ?? $competitor->name,
                    'entity_url' => $competitorData['url'] ?? $competitorDomain,
                    'visibility' => $this->validateMetric($competitorData['visibility'] ?? 0, 0, 100),
                    'sentiment' => $this->validateMetric($competitorData['sentiment'] ?? 0, 0, 100),
                    'position' => $this->validateMetric($competitorData['position'] ?? 5.0, 1.0, 10.0),
                    'raw_data' => $competitorData['raw_data'] ?? [],
                    'analysis_session_id' => $sessionId,
                    'analyzed_at' => now(),
                ]);
            }
        }

        Log::warning('No matching competitor found in AI analysis', [
            'competitor_name' => $competitor->name,
            'competitor_domain' => $competitor->domain,
        ]);

        return null;
    }

    /**
     * Validate metric values within acceptable ranges
     */
    protected function validateMetric($value, $min, $max): float
    {
        $numericValue = is_numeric($value) ? (float) $value : 0;

        return max($min, min($max, $numericValue));
    }

    /**
     * Get latest competitive stats for a brand with trends (only accepted competitors)
     */
    public function getLatestStatsWithTrends(Brand $brand, ?int $aiModelId = null): array
    {
        $stats = BrandCompetitiveStat::latestForBrand($brand->id)
            ->with(['competitor'])
            ->where(function ($query) {
                // Include brand stats (entity_type = 'brand')
                $query->where('entity_type', 'brand')
                      // OR competitor stats where the competitor is accepted
                    ->orWhereHas('competitor', function ($subQuery) {
                        $subQuery->accepted();
                    });
            })
            ->orderBy('entity_type')
            ->orderBy('entity_name')
            ->get();

        $statsArray = $stats->map(function ($stat) use ($aiModelId) {
            // Skip if ai_model_id filter is provided and doesn't match
            if ($aiModelId && $stat->ai_model_id != $aiModelId) {
                return null;
            }
            
            $trends = $stat->getTrends();
            $statArray = $stat->toArray();

            // Use competitor name from competitors table if available, not from analysis table
            if ($stat->entity_type === 'competitor' && $stat->competitor) {
                $statArray['entity_name'] = $stat->competitor->name;
                $statArray['entity_url'] = $stat->competitor->domain;
            } elseif ($stat->entity_type === 'brand' && $stat->brand) {
                $statArray['entity_name'] = $stat->brand->name;
                $statArray['entity_url'] = $stat->brand->website ?? $stat->brand->domain ?? $statArray['entity_url'];
            }

            $statArray['trends'] = $trends;
            $statArray['visibility_percentage'] = $stat->visibility_percentage;
            $statArray['position_formatted'] = $stat->position_formatted;
            $statArray['sentiment_level'] = $stat->sentiment_level;
            $statArray['sov']            = $stat->visibility;
            $statArray['sov_percentage'] = $stat->visibility_percentage;

            return $statArray;
        })->filter()->values()->toArray(); // Filter out null values from ai_model_id filtering

        // If no stats exist, create placeholders for brand and accepted competitors
        if (empty($statsArray)) {
            $placeholders = [];

            // Add brand placeholder
            $placeholders[] = [
                'id' => 0,
                'entity_type' => 'brand',
                'entity_name' => $brand->name,
                'entity_url' => $brand->website ?? $brand->domain ?? '',
                'visibility' => 0,
                'sov' => 0,
                'sov_percentage' => '0%',
                'sentiment' => 0,
                'position' => 0,
                'analyzed_at' => null,
                'trends' => [
                    'visibility_trend' => 'new',
                    'sov_trend' => 'new',
                    'sentiment_trend' => 'new',
                    'position_trend' => 'new',
                    'visibility_change' => 0,
                    'sov_change' => 0,
                    'sentiment_change' => 0,
                    'position_change' => 0,
                ],
                'visibility_percentage' => '0%',
                'position_formatted' => '0',
                'sentiment_level' => 'Neutral',
            ];

            // Add accepted competitors as placeholders
            $competitors = $brand->competitors()->accepted()->get();
            foreach ($competitors as $index => $competitor) {
                $placeholders[] = [
                    'id' => 0,
                    'competitor_id' => $competitor->id,
                    'entity_type' => 'competitor',
                    'entity_name' => $competitor->name,
                    'entity_url' => $competitor->domain,
                    'visibility' => 0,
                    'sov' => 0,
                    'sov_percentage' => '0%',
                    'sentiment' => null,
                    'position' => 0,
                    'analyzed_at' => null,
                    'trends' => [
                        'visibility_trend' => 'new',
                        'sov_trend' => 'new',
                        'sentiment_trend' => 'new',
                        'position_trend' => 'new',
                        'visibility_change' => 0,
                        'sov_change' => 0,
                        'sentiment_change' => 0,
                        'position_change' => 0,
                    ],
                    'visibility_percentage' => '0%',
                    'position_formatted' => '0',
                    'sentiment_level' => 'N/A',
                ];
            }

            return $placeholders;
        }

        // Stats exist but may not cover every accepted competitor (e.g., competitors added
        // after the last analysis run). Always append 0% placeholders for any missing ones
        // so the BVI table always shows the full competitor set.
        $presentCompetitorIds = collect($statsArray)
            ->where('entity_type', 'competitor')
            ->pluck('competitor_id')
            ->filter()
            ->all();

        $acceptedCompetitors = $brand->competitors()->accepted()->get();
        foreach ($acceptedCompetitors as $competitor) {
            if (in_array($competitor->id, $presentCompetitorIds)) {
                continue;
            }
            $statsArray[] = [
                'id'                    => 0,
                'competitor_id'         => $competitor->id,
                'entity_type'           => 'competitor',
                'entity_name'           => $competitor->name,
                'entity_url'            => $competitor->domain,
                'visibility'            => 0,
                'sov'                   => 0,
                'sov_percentage'        => '0%',
                'sentiment'             => null,
                'position'              => 0,
                'analyzed_at'           => null,
                'trends'                => [
                    'visibility_trend'  => 'new',
                    'sov_trend'         => 'new',
                    'sentiment_trend'   => 'new',
                    'position_trend'    => 'new',
                    'visibility_change' => 0,
                    'sov_change'        => 0,
                    'sentiment_change'  => 0,
                    'position_change'   => 0,
                ],
                'visibility_percentage' => '0%',
                'position_formatted'    => '0',
                'sentiment_level'       => 'N/A',
            ];
        }

        return $statsArray;
    }

    /**
     * Get historical competitive stats for visibility chart (all dates)
     */
    /**
     * Get historical competitive stats for visibility chart (all dates)
     */
    public function getHistoricalStatsForChart(Brand $brand, ?int $days = 30, ?int $aiModelId = null, string $timezone = '+00:00'): array
    {
        $startDate = now()->subDays($days);
        $endDate = now()->endOfDay();

        // Get competitive stats ordered by date
        $query = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->with(['competitor', 'brand'])
            ->where(function ($query) {
                // Include brand stats (entity_type = 'brand')
                $query->where('entity_type', 'brand')
                      // OR competitor stats where the competitor is accepted
                    ->orWhereHas('competitor', function ($subQuery) {
                        $subQuery->accepted();
                    });
            });

        if ($aiModelId) {
            // Never exclude manual override rows by ai_model_id — they have ai_model_id=null.
            $query->where(function ($q) use ($aiModelId) {
                $q->where('ai_model_id', $aiModelId)
                  ->orWhere('is_manual_override', true);
            });
        }

        $stats = $query->orderBy('analyzed_at')->get();

        if ($stats->isEmpty()) {
            return [];
        }

        // Build grouped chart data from AI rows first.
        // Then apply override visibility values using the competitor_id / brand entity key
        // to look up the domain — more reliable than re-computing the domain from the
        // override row's entity_url which may differ from the AI row's stored URL.
        $groupedByDate    = [];
        $entityKeyToDomain = []; // "date|entityKey" => cleanDomain, built from AI rows

        $resolveDomain = function ($stat): string {
            $entityUrl = $stat->entity_url;
            if ($stat->entity_type === 'competitor' && $stat->competitor) {
                $entityUrl = $stat->competitor->domain;
            } elseif ($stat->entity_type === 'brand' && $stat->brand) {
                $entityUrl = $stat->brand->website ?? $stat->brand->domain ?? $entityUrl;
            }
            $clean = str_replace(['https://', 'http://', 'www.'], '', (string) $entityUrl);
            return explode('/', $clean)[0];
        };

        // Pass 1 — AI rows only: populate $groupedByDate and record entityKey→domain mapping.
        foreach ($stats->filter(fn ($s) => ! $s->is_manual_override) as $stat) {
            $date      = $stat->analyzed_at->copy()->setTimezone($timezone)->format('Y-m-d');
            $entityKey = $stat->competitor_id ? 'c_'.$stat->competitor_id : 'brand';
            $domain    = $resolveDomain($stat);

            if (! isset($groupedByDate[$date])) {
                $groupedByDate[$date] = [];
            }

            $entityName = $stat->entity_name;
            if ($stat->entity_type === 'competitor' && $stat->competitor) {
                $entityName = $stat->competitor->name;
            } elseif ($stat->entity_type === 'brand' && $stat->brand) {
                $entityName = $stat->brand->name;
            }

            $groupedByDate[$date][$domain] = [
                'entity_name' => $entityName,
                'visibility'  => $stat->visibility,
                'sentiment'   => $stat->sentiment,
                'position'    => $stat->position,
            ];

            $entityKeyToDomain[$date.'|'.$entityKey] = $domain;
        }

        // Pass 2 — override rows: update visibility using the domain recorded in Pass 1
        // (keyed by competitor_id, not domain string), so we always overwrite the right entry.
        foreach ($stats->filter(fn ($s) => $s->is_manual_override) as $stat) {
            $date      = $stat->analyzed_at->copy()->setTimezone($timezone)->format('Y-m-d');
            $entityKey = $stat->competitor_id ? 'c_'.$stat->competitor_id : 'brand';
            $mapKey    = $date.'|'.$entityKey;

            if (isset($entityKeyToDomain[$mapKey])) {
                // Update the visibility for the domain we already know belongs to this entity.
                $domain = $entityKeyToDomain[$mapKey];
                $groupedByDate[$date][$domain]['visibility'] = $stat->visibility;
            } else {
                // No AI row exists for this date — insert a new entry using the override data.
                $domain = $resolveDomain($stat);
                if (! isset($groupedByDate[$date])) {
                    $groupedByDate[$date] = [];
                }
                $entityName = $stat->entity_name;
                if ($stat->entity_type === 'competitor' && $stat->competitor) {
                    $entityName = $stat->competitor->name;
                } elseif ($stat->entity_type === 'brand' && $stat->brand) {
                    $entityName = $stat->brand->name;
                }
                $groupedByDate[$date][$domain] = [
                    'entity_name' => $entityName,
                    'visibility'  => $stat->visibility,
                    'sentiment'   => $stat->sentiment,
                    'position'    => $stat->position,
                ];
            }
        }

        return $groupedByDate;
    }


    /**
     * Check if brand needs analysis (hasn't been analyzed recently)
     */
    public function brandNeedsAnalysis(Brand $brand, int $hoursThreshold = 24): bool
    {
        $recentAnalysis = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('analyzed_at', '>', now()->subHours($hoursThreshold))
            ->exists();

        return ! $recentAnalysis;
    }

    /**
     * Get brands that need competitive analysis
     */
    public function getBrandsNeedingAnalysis(int $hoursThreshold = 24): \Illuminate\Database\Eloquent\Collection
    {
        // Get brands that have accepted competitors with domains
        $brandsWithCompetitors = Brand::whereHas('competitors', function ($query) {
            $query->accepted()->whereNotNull('domain');
        });

        // Filter out brands that have been analyzed recently
        $brandsNeedingAnalysis = $brandsWithCompetitors->whereDoesntHave('competitiveStats', function ($query) use ($hoursThreshold) {
            $query->where('analyzed_at', '>', now()->subHours($hoursThreshold));
        });

        return $brandsNeedingAnalysis->get();
    }

    /**
     * Fallback when no BrandMention data exists.
     * Uses the most recent analysis session that contains BOTH the brand AND at least one competitor.
     * This avoids using partial sessions (brand-only runs) that store 100% visibility.
     * Falls back to getLatestStatsWithTrends if no complete session exists.
     */
    protected function buildFallbackStats(Brand $brand, ?int $aiModelId = null): array
    {
        // Find the most recent analysis_session_id that has entries for both brand and competitor
        $completeSession = DB::table('brand_competitive_stats')
            ->where('brand_id', $brand->id)
            ->whereNotNull('analysis_session_id')
            ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
            ->select('analysis_session_id')
            ->groupBy('analysis_session_id')
            ->havingRaw('SUM(entity_type = ?) > 0 AND SUM(entity_type = ?) > 0', ['brand', 'competitor'])
            ->orderByRaw('MAX(analyzed_at) DESC')
            ->first();

        if ($completeSession) {
            $sessionStats = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('analysis_session_id', $completeSession->analysis_session_id)
                ->with(['competitor'])
                ->get();

            $result = [];
            foreach ($sessionStats as $stat) {
                $trends    = $stat->getTrends();
                $statArray = $stat->toArray();
                if ($stat->entity_type === 'competitor' && $stat->competitor) {
                    $statArray['entity_name'] = $stat->competitor->name;
                    $statArray['entity_url']  = $stat->competitor->domain ?? '';
                } elseif ($stat->entity_type === 'brand') {
                    $statArray['entity_name'] = $brand->name;
                    $statArray['entity_url']  = $brand->website ?? '';
                }
                $statArray['trends']               = $trends;
                $statArray['visibility_percentage'] = $stat->visibility_percentage;
                $statArray['position_formatted']    = $stat->position_formatted;
                $statArray['sentiment_level']       = $stat->sentiment_level;
                // Fallback has no real SOV; mirror visibility so the frontend key exists
                $statArray['sov']             = $stat->visibility;
                $statArray['sov_percentage']  = $stat->visibility_percentage;
                $result[] = $statArray;
            }

            usort($result, fn ($a, $b) => $b['visibility'] <=> $a['visibility']);

            return $result;
        }

        // No complete session — fall back to latest per-entity stats
        return $this->getLatestStatsWithTrends($brand, $aiModelId);
    }

    /**
     * Get mention-based BVI stats with four separate metrics per entity:
     *
     *  Visibility = average of daily SOV values (mirrors the graph)
     *               daily value = (entity_mentions_that_day / total_mentions_that_day) × 100
     *
     *  SOV        = aggregate Share of Voice over the selected period
     *               = (entity_total_mentions / all_entity_total_mentions) × 100
     *
     *  Sentiment  = average of daily avg-sentiment scores (0–100)
     *  Position   = average of daily avg-position scores converted to 1–10 scale
     *
     * Both Visibility and SOV have independent trends via the relative growth formula.
     */
    public function getMentionBasedVisibility(Brand $brand, ?int $days = 30, ?int $aiModelId = null, string $timezone = '+00:00'): array
    {
        $startDate = now()->subDays($days);
        $endDate   = now()->endOfDay();

        // Pre-load competitors so we always display the current name, not the stale
        // entity_name stored in brand_mentions at analysis time (which can be outdated
        // if the competitor was renamed after the last analysis run).
        $competitorsById = $brand->competitors()->get()->keyBy('id');

        // 1. Daily entity stats — both prompts (for Visibility) and mentions (for SOV)
        $dailyEntityQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date"),
                'entity_type',
                'entity_name',
                'entity_domain',
                'competitor_id',
                DB::raw('COUNT(DISTINCT brand_prompt_id) as prompts_mentioned'),
                DB::raw('SUM(mention_count) as entity_mentions'),
                DB::raw('AVG(position) as avg_position'),
                DB::raw('AVG(sentiment) as avg_mention_sentiment')
            )
            ->groupBy(DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))"), 'entity_type', 'entity_name', 'entity_domain', 'competitor_id');

        if ($aiModelId) {
            $dailyEntityQuery->where('ai_model_id', $aiModelId);
        }

        $dailyEntityStats = $dailyEntityQuery->get();

        // Pre-load per-day manual overrides keyed as "date|entityKey".
        // Loaded before any early returns so overrides are always applied regardless of mention data.
        $dailyOverrides = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('is_manual_override', true)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->orderBy('id')
            ->get()
            ->mapWithKeys(function ($stat) use ($timezone) {
                $date      = $stat->analyzed_at->copy()->setTimezone($timezone)->format('Y-m-d');
                $entityKey = $stat->competitor_id ? 'c_'.$stat->competitor_id : 'brand';
                return [$date.'|'.$entityKey => (float) $stat->visibility];
            });

        // Build latest override value per entity key (most recent date wins).
        // Used to show the custom value directly rather than averaging it with AI values.
        $latestOverridePerEntity = [];
        foreach ($dailyOverrides as $dayKey => $overrideValue) {
            [$date, $entityKey] = explode('|', $dayKey, 2);
            if (! isset($latestOverridePerEntity[$entityKey]) || $date > $latestOverridePerEntity[$entityKey]['date']) {
                $latestOverridePerEntity[$entityKey] = ['date' => $date, 'value' => $overrideValue];
            }
        }

        // Pre-load AI visibility per date/entity from brand_competitive_stats (non-override).
        // Using the same source as the graph so BVI values match what the graph shows.
        // Key format: "YYYY-MM-DD|entityKey"  Value: avg visibility across sessions that day.
        $aiVisibilityByDayKey = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('is_manual_override', false)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
            ->get()
            ->groupBy(function ($s) use ($timezone) {
                $d = $s->analyzed_at->copy()->setTimezone($timezone)->format('Y-m-d');
                $k = $s->competitor_id ? 'c_'.$s->competitor_id : 'brand';
                return $d.'|'.$k;
            })
            ->map(fn ($g) => (float) $g->avg('visibility'));

        // Shared logic: build per-entity value lists from AI stats + overrides, then overlay
        // onto buildFallbackStats metadata. Used when mention data is absent or sparse.
        // Rule per day: use manual override if one exists, otherwise use the AI stat value.
        $buildFallbackWithOverrides = function () use ($brand, $aiModelId, $aiVisibilityByDayKey, $dailyOverrides, $latestOverridePerEntity): array {
            $entityValuesMap = [];
            foreach ($aiVisibilityByDayKey as $dayKey => $aiValue) {
                [, $entityKey] = explode('|', $dayKey, 2);
                $entityValuesMap[$entityKey][] = $dailyOverrides->has($dayKey)
                    ? $dailyOverrides->get($dayKey)
                    : $aiValue;
            }
            // Orphan overrides — days with a manual value but no AI stat row.
            foreach ($dailyOverrides as $overrideKey => $overrideValue) {
                if ($aiVisibilityByDayKey->has($overrideKey)) continue;
                [, $entityKey] = explode('|', $overrideKey, 2);
                $entityValuesMap[$entityKey][] = $overrideValue;

                
            }

            // To get just the values as a flat array:
            $overrideValues_check = $dailyOverrides->values()->all();
           
            if (empty($entityValuesMap)) {
                return $this->buildFallbackStats($brand, $aiModelId);
            }
            $fallbackResult = $this->buildFallbackStats($brand, $aiModelId);
            return array_map(function ($stat) use ($entityValuesMap, $latestOverridePerEntity, $overrideValues_check) {
                $entityKey = ($stat['competitor_id'] ?? null) ? 'c_'.$stat['competitor_id'] : 'brand';
                // If a manual override exists, show it directly instead of averaging.
                if (isset($latestOverridePerEntity[$entityKey])) {

                // Flatten all values and sum them
              $overrideVal                   = array_sum($overrideValues_check ) / count($overrideValues_check);
                   // $overrideVal                   = $entityValuesMap[$entityKey]['value'];
                    
                    $stat['visibility']            = round($overrideVal, 2);
                    $stat['visibility_percentage'] = round($overrideVal, 1).'%';
                    $stat['sov']                   = round($overrideVal, 2);
                    $stat['sov_percentage']        = round($overrideVal, 1).'%';
                    return $stat;
                }
                $values = $entityValuesMap[$entityKey] ?? null;
                if (! $values) return $stat;
                $avgVis                        = array_sum($values) / count($values);
                $stat['visibility']            = round($avgVis, 2);
                $stat['visibility_percentage'] = round($avgVis, 1).'%';
                $stat['sov']                   = round($avgVis, 2);
                $stat['sov_percentage']        = round($avgVis, 1).'%';
                return $stat;
            }, $fallbackResult);
        };

        if ($dailyEntityStats->isEmpty()) {
            $fallback = $buildFallbackWithOverrides();
            return $this->appendMissingAcceptedCompetitors($brand, $fallback, $days, $aiModelId, $timezone);
        }

        // Exclude manual override rows from this count so they never trigger the sparse-data path.
        $distinctMentionDates = $dailyEntityStats->pluck('date')->unique()->count();
        $distinctStatDates    = DB::table('brand_competitive_stats')
            ->where('brand_id', $brand->id)
            ->where('is_manual_override', false)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
            ->selectRaw("COUNT(DISTINCT DATE(CONVERT_TZ(analyzed_at, '+00:00', '$timezone'))) as cnt")
            ->value('cnt');

        if ($distinctMentionDates < $distinctStatDates) {
            $fallback = $buildFallbackWithOverrides();
            return $this->appendMissingAcceptedCompetitors($brand, $fallback, $days, $aiModelId, $timezone);
        }

        // 2. Daily totals for SOV metadata (mention_data)
        $dailyTotalsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date"),
                DB::raw('COUNT(DISTINCT brand_prompt_id) as total_prompts'),
                DB::raw('SUM(mention_count) as total_mentions')
            )
            ->groupBy(DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))"));

        if ($aiModelId) {
            $dailyTotalsQuery->where('ai_model_id', $aiModelId);
        }

        $dailyTotals = $dailyTotalsQuery->get()->keyBy('date');

        // 3. Group daily rows by entity; accumulate daily visibility values
        $entityData       = [];
        $processedDayKeys = [];
        foreach ($dailyEntityStats as $row) {
            $key         = $row->competitor_id !== null ? 'c_'.$row->competitor_id : 'brand';
            $dayTotals   = $dailyTotals[$row->date] ?? null;
            $totalMentionsThatDay = $dayTotals?->total_mentions ?? 0;

            // Use the AI-scored visibility from brand_competitive_stats (same source as the graph).
            // Fall back to mention-based SOV only if no stat exists for this day.
            $aiDayKey        = $row->date.'|'.$key;
            $dailyVisibility = $aiVisibilityByDayKey->has($aiDayKey)
                ? $aiVisibilityByDayKey->get($aiDayKey)
                : ($totalMentionsThatDay > 0 ? ($row->entity_mentions / $totalMentionsThatDay) * 100 : 0);

            // If a per-day manual override exists for this date/entity, use it instead.
            $overrideDayKey = $row->date.'|'.$key;
            $processedDayKeys[$overrideDayKey] = true;
            if ($dailyOverrides->has($overrideDayKey)) {
                $dailyVisibility = $dailyOverrides->get($overrideDayKey);
            }

            if (! isset($entityData[$key])) {
                $entityData[$key] = [
                    'entity_type'             => $row->entity_type,
                    'entity_name'             => $row->entity_name,
                    'entity_domain'           => $row->entity_domain,
                    'competitor_id'           => $row->competitor_id,
                    'visibility_values'       => [], // daily SOV — avg = Visibility column
                    'positions'               => [],
                    'sentiments'              => [],
                    'total_prompts_mentioned' => 0,
                    'total_entity_mentions'   => 0,
                ];
            }

            $entityData[$key]['visibility_values'][]     = $dailyVisibility;
            $entityData[$key]['total_prompts_mentioned'] += $row->prompts_mentioned;
            $entityData[$key]['total_entity_mentions']   += $row->entity_mentions;

            if ($row->avg_position !== null) {
                $entityData[$key]['positions'][] = (float) $row->avg_position;
            }
            if ($row->avg_mention_sentiment !== null) {
                $entityData[$key]['sentiments'][] = (float) $row->avg_mention_sentiment;
            }
        }

        // Inject orphan overrides — manual values for dates that have no brand_mentions row.
        // Without this, an override on a "quiet" day is silently ignored in the period average.
        foreach ($dailyOverrides as $overrideKey => $overrideValue) {
            if (isset($processedDayKeys[$overrideKey])) {
                continue; // already handled inside the brand_mentions loop above
            }
            [$overrideDate, $entityKey] = explode('|', $overrideKey, 2);
            if (! isset($entityData[$entityKey])) {
                continue; // entity has no brand_mentions at all in this period — skip
            }
            $entityData[$entityKey]['visibility_values'][] = $overrideValue;
        }

        // 4. Period-level totals for SOV aggregate and mention_data metadata
        $totalAllPrompts  = $dailyTotals->sum('total_prompts');
        $totalAllMentions = $dailyTotals->sum('total_mentions');

        // 5. Build the stats array — one entry per entity
        $visibilityStats = [];

        foreach ($entityData as $key => $data) {
            // Visibility = average of daily presence-frequency values
            $avgVisibility = count($data['visibility_values']) > 0
                ? array_sum($data['visibility_values']) / count($data['visibility_values'])
                : 0;

            // SOV = aggregate over the full period
            $sov = $totalAllMentions > 0
                ? ($data['total_entity_mentions'] / $totalAllMentions) * 100
                : 0;

            // Position = average of daily scores → 1–10 scale
            $avgPosition   = count($data['positions']) > 0
                ? array_sum($data['positions']) / count($data['positions'])
                : 5000;
            $positionScore = min(10, max(1, round($avgPosition / 500, 1)));

            // Sentiment = average of daily values
            $avgSentiment = count($data['sentiments']) > 0
                ? (int) round(array_sum($data['sentiments']) / count($data['sentiments']))
                : null;

            $competitorId    = $data['competitor_id'];
            $competitiveStat = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('entity_type', $data['entity_type'])
                ->when($competitorId, fn ($q) => $q->where('competitor_id', $competitorId))
                ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
                ->latest('analyzed_at')
                ->first();

            $entityUrl = $data['entity_domain']
                ? 'https://'.$data['entity_domain']
                : ($data['entity_type'] === 'brand' ? $brand->website : '');

            $displaySentiment = $avgSentiment ?? ($data['entity_type'] === 'brand' ? $competitiveStat?->sentiment : null);

            $sentimentLevel = 'N/A';
            if ($displaySentiment !== null) {
                $sentimentLevel = match (true) {
                    $displaySentiment >= 80 => 'Very Positive',
                    $displaySentiment >= 60 => 'Positive',
                    $displaySentiment >= 40 => 'Neutral',
                    $displaySentiment >= 20 => 'Negative',
                    default                 => 'Very Negative',
                };
            }

            $trends = $this->calculateTrendsForEntity($brand, $data['entity_type'], $competitorId, $days, $aiModelId, $competitiveStat, $timezone);

            // Use the current competitor name from the competitors table so that renames
            // are reflected immediately without requiring a new analysis run.
            $resolvedName = $data['entity_name'];
            if ($competitorId && isset($competitorsById[$competitorId])) {
                $resolvedName = $competitorsById[$competitorId]->name;
            }

            // If a manual override exists for this entity, show it directly.
            $entityKey = $competitorId ? 'c_'.$competitorId : 'brand';
            if (isset($latestOverridePerEntity[$entityKey])) {
                $avgVisibility = $latestOverridePerEntity[$entityKey]['value'];
            }

            $visibilityStats[] = [
                'id'                    => $competitiveStat->id ?? 0,
                'competitor_id'         => $competitorId,
                'entity_type'           => $data['entity_type'],
                'entity_name'           => $resolvedName,
                'entity_url'            => $entityUrl,
                'visibility'            => round($avgVisibility, 2),
                'sov'                   => round($sov, 2),
                'sentiment'             => $displaySentiment,
                'position'              => round($positionScore, 1),
                'analyzed_at'           => now()->toDateTimeString(),
                'trends'                => $trends,
                'visibility_percentage' => round($avgVisibility, 1).'%',
                'sov_percentage'        => round($sov, 1).'%',
                'position_formatted'    => '#'.round($positionScore, 1),
                'sentiment_level'       => $sentimentLevel,
                'mention_data'          => [
                    'prompts_mentioned'  => $data['total_prompts_mentioned'],
                    'total_prompts'      => $totalAllPrompts,
                    'total_mentions'     => $data['total_entity_mentions'],
                    'total_all_mentions' => $totalAllMentions,
                    'share_of_voice'     => round($sov, 2),
                ],
            ];
        }

        // Ensure the main brand always appears (0% row if no mentions)
        $brandAlreadyPresent = collect($visibilityStats)->contains('entity_type', 'brand');
        if (! $brandAlreadyPresent) {
            $brandStat = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('entity_type', 'brand')
                ->latest('analyzed_at')
                ->first();

            $visibilityStats[] = [
                'id'                    => $brandStat->id ?? 0,
                'entity_type'           => 'brand',
                'entity_name'           => $brand->name,
                'entity_url'            => $brand->website ?? '',
                'visibility'            => 0,
                'sov'                   => 0,
                'sentiment'             => $brandStat?->sentiment,
                'position'              => 0,
                'analyzed_at'           => now()->toDateTimeString(),
                'trends'                => $this->calculateTrendsForEntity($brand, 'brand', null, $days, $aiModelId, $brandStat, $timezone),
                'visibility_percentage' => '0%',
                'sov_percentage'        => '0%',
                'position_formatted'    => '#0',
                'sentiment_level'       => 'N/A',
                'mention_data'          => [
                    'prompts_mentioned'  => 0,
                    'total_prompts'      => $totalAllPrompts,
                    'total_mentions'     => 0,
                    'total_all_mentions' => $totalAllMentions,
                    'share_of_voice'     => 0,
                ],
            ];
        }

        // Ensure every accepted competitor appears — 0% rows for those with no mentions
        $competitors = $brand->competitors()->accepted()->get();
        foreach ($competitors as $competitor) {
            if (isset($entityData['c_'.$competitor->id])) {
                continue;
            }

            $visibilityStats[] = [
                'id'                    => $competitor->id,
                'competitor_id'         => $competitor->id,
                'entity_type'           => 'competitor',
                'entity_name'           => $competitor->name,
                'entity_url'            => $competitor->domain ? 'https://'.explode('/', preg_replace('#^https?://(www\.)?#', '', strtolower($competitor->domain)))[0] : '',
                'visibility'            => 0,
                'sov'                   => 0,
                'sentiment'             => null,
                'position'              => 0,
                'analyzed_at'           => now()->toDateTimeString(),
                'trends'                => $this->calculateTrendsForEntity($brand, 'competitor', $competitor->id, $days, $aiModelId, null, $timezone),
                'visibility_percentage' => '0%',
                'sov_percentage'        => '0%',
                'position_formatted'    => '#0',
                'sentiment_level'       => 'N/A',
                'mention_data'          => [
                    'prompts_mentioned'  => 0,
                    'total_prompts'      => $totalAllPrompts,
                    'total_mentions'     => 0,
                    'total_all_mentions' => $totalAllMentions,
                    'share_of_voice'     => 0,
                ],
            ];
        }

        // Remove duplicates within the same entity_type (brand vs competitor are intentionally kept separate).
        // For URL key: scope by entity_type so a competitor sharing the brand domain is never dropped.
        // For no-url entries: use competitor_id (reliable FK) instead of id which may be 0 for multiple entries.
        $visibilityStats = collect($visibilityStats)
            ->sortByDesc(fn ($item) => $item['entity_type'] === 'brand')
            ->unique(function ($item) {
                $urlKey = $item['entity_url']
                    ? strtolower(parse_url($item['entity_url'], PHP_URL_HOST) ?? $item['entity_url'])
                    : 'no-domain-'.($item['competitor_id'] ?? $item['id']);
                return $item['entity_type'].'|'.$urlKey;
            })
            ->unique(fn ($item) => $item['entity_type'].'|'.strtolower(trim($item['entity_name'])))
            ->values()
            ->all();

        // Sort by visibility descending
        usort($visibilityStats, fn ($a, $b) => $b['visibility'] <=> $a['visibility']);

        return $visibilityStats;
    }

    /**
     * Calculate trends for an entity using the relative growth formula:
     *   trend = (last_day_value - first_day_value) / first_day_value × 100
     *
     * Applied consistently to Visibility (SOV), Sentiment, and Position.
     */
    protected function calculateTrendsForEntity(Brand $brand, string $entityType, ?int $competitorId, int $days = 30, ?int $aiModelId = null, ?BrandCompetitiveStat $latestStat = null, string $timezone = '+00:00'): array
    {
        $currentPeriodStart = now()->subDays($days);

        // ── Build daily SOV values exactly as the chart does ─────────────────
        // Entity daily aggregates (ordered chronologically)
        $dailyEntityRows = BrandMention::where('brand_id', $brand->id)
            ->where('entity_type', $entityType)
            ->when($competitorId, fn ($q) => $q->where('competitor_id', $competitorId))
            ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
            ->whereBetween('analyzed_at', [$currentPeriodStart, now()])
            ->selectRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date, SUM(mention_count) as entity_mentions, AVG(sentiment) as avg_sentiment, AVG(position) as avg_position")
            ->groupByRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))")
            ->orderBy('date')
            ->get();

        if ($dailyEntityRows->count() <= 1) {
            // brand_mentions is sparse — fall back to brand_competitive_stats for trend.
            // Uses the same formula as the main path: (last - first) / first × 100.
            $statRows = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('entity_type', $entityType)
                ->where('is_manual_override', false)
                ->when($competitorId, fn ($q) => $q->where('competitor_id', $competitorId))
                ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
                ->whereBetween('analyzed_at', [$currentPeriodStart, now()])
                ->selectRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date, AVG(visibility) as avg_vis, AVG(sentiment) as avg_sentiment")
                ->groupByRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))")
                ->orderBy('date')
                ->get();

            if ($statRows->count() >= 2) {
                // Build a unified daily series matching the graph's data source:
                // use brand_mentions SOV where available (same override logic as the graph),
                // fall back to brand_competitive_stats visibility for dates without mention data.
                $mentionTotals = BrandMention::where('brand_id', $brand->id)
                    ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
                    ->whereBetween('analyzed_at', [$currentPeriodStart, now()])
                    ->selectRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date, SUM(mention_count) as total")
                    ->groupByRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))")
                    ->get()->keyBy('date');

                $entityMentionsByDate = BrandMention::where('brand_id', $brand->id)
                    ->where('entity_type', $entityType)
                    ->when($competitorId, fn ($q) => $q->where('competitor_id', $competitorId))
                    ->when(! $competitorId, fn ($q) => $q->whereNull('competitor_id'))
                    ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
                    ->whereBetween('analyzed_at', [$currentPeriodStart, now()])
                    ->selectRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date, SUM(mention_count) as entity_mentions")
                    ->groupByRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))")
                    ->get()->keyBy('date');

                $unifiedSeries = [];
                $sentimentSeries = [];
                foreach ($statRows as $row) {
                    $dayTotal = isset($mentionTotals[$row->date]) ? (float) $mentionTotals[$row->date]->total : 0;
                    if ($dayTotal > 0 && isset($entityMentionsByDate[$row->date])) {
                        $unifiedSeries[$row->date] = ((float) $entityMentionsByDate[$row->date]->entity_mentions / $dayTotal) * 100;
                    } else {
                        $unifiedSeries[$row->date] = (float) $row->avg_vis;
                    }
                    $sentimentSeries[$row->date] = (float) ($row->avg_sentiment ?? 50);
                }

                $visVals  = array_values($unifiedSeries);
                $sentVals = array_values($sentimentSeries);

                $firstVis  = $visVals[0];
                $lastVis   = end($visVals);
                $firstSent = $sentVals[0];
                $lastSent  = end($sentVals);

                // If first day = 0 there is no valid baseline; return 'new' to avoid
                // an artificially inflated percentage (e.g. 0→50 would otherwise show 100%).
                if ($firstVis <= 0) {
                    return [
                        'visibility_trend'  => 'new',
                        'sov_trend'         => 'new',
                        'sentiment_trend'   => 'stable',
                        'position_trend'    => 'stable',
                        'visibility_change' => 0,
                        'sov_change'        => 0,
                        'sentiment_change'  => 0,
                        'position_change'   => 0,
                    ];
                }

                $visChange  = (($lastVis  - $firstVis)  / $firstVis)  * 100;
                $sentChange = $firstSent > 0 ? (($lastSent - $firstSent) / $firstSent) * 100 : 0;

                return [
                    'visibility_trend'  => $visChange  >  1 ? 'up' : ($visChange  < -1 ? 'down' : 'stable'),
                    'sov_trend'         => $visChange  >  1 ? 'up' : ($visChange  < -1 ? 'down' : 'stable'),
                    'sentiment_trend'   => $sentChange >  2 ? 'up' : ($sentChange < -2 ? 'down' : 'stable'),
                    'position_trend'    => 'stable',
                    'visibility_change' => round($visChange, 1),
                    'sov_change'        => round($visChange, 1),
                    'sentiment_change'  => round($sentChange, 1),
                    'position_change'   => 0,
                ];
            }

            return [
                'visibility_trend'  => 'new',
                'sov_trend'         => 'new',
                'sentiment_trend'   => 'stable',
                'position_trend'    => 'stable',
                'visibility_change' => 0,
                'sov_change'        => 0,
                'sentiment_change'  => 0,
                'position_change'   => 0,
            ];
        }

        // Daily total mentions for all entities (same denominator the chart uses)
        $dailyTotals = BrandMention::where('brand_id', $brand->id)
            ->when($aiModelId, fn ($q) => $q->where('ai_model_id', $aiModelId))
            ->whereBetween('analyzed_at', [$currentPeriodStart, now()])
            ->selectRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date, SUM(mention_count) as total_mentions")
            ->groupByRaw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))")
            ->get()->keyBy('date');

        // Build chronological daily SOV/sentiment/position values
        $dailySov       = [];
        $dailySentiment = [];
        $dailyPosition  = [];

        foreach ($dailyEntityRows as $row) {
            $totalMentions  = $dailyTotals[$row->date]?->total_mentions ?? 0;
            $dailySov[]     = $totalMentions > 0 ? ($row->entity_mentions / $totalMentions) * 100 : 0;
            $dailySentiment[] = $row->avg_sentiment !== null ? (float) $row->avg_sentiment : null;
            $dailyPosition[]  = $row->avg_position !== null ? (float) $row->avg_position : null;
        }

        $firstDaySov      = $dailySov[0];
        $lastDaySov       = end($dailySov);
        $firstDaySentiment = $dailySentiment[0] ?? 50;
        $lastDaySentiment  = end($dailySentiment) ?: 50;
        $firstDayPosition  = $dailyPosition[0];
        $lastDayPosition   = end($dailyPosition);

        // ── Relative trend: (last - first) / first × 100 ────────────────────
        // No valid baseline — brand just became visible. Return 'new' (same rule as fallback path).
        if ($firstDaySov <= 0 && $lastDaySov > 0) {
            return [
                'visibility_trend'  => 'new',
                'sov_trend'         => 'new',
                'sentiment_trend'   => 'stable',
                'position_trend'    => 'stable',
                'visibility_change' => 0,
                'sov_change'        => 0,
                'sentiment_change'  => 0,
                'position_change'   => 0,
            ];
        }

        $visibilityChange = 0;
        if ($firstDaySov > 0) {
            $visibilityChange = (($lastDaySov - $firstDaySov) / $firstDaySov) * 100;
        }

        $sentimentChange = 0;
        if ($firstDaySentiment > 0) {
            $sentimentChange = (($lastDaySentiment - $firstDaySentiment) / $firstDaySentiment) * 100;
        } elseif ($lastDaySentiment > 0) {
            $sentimentChange = 100;
        }

        $positionChange = 0;
        if ($firstDayPosition !== null && $lastDayPosition !== null && $firstDayPosition > 0) {
            $positionChange = (($firstDayPosition - $lastDayPosition) / $firstDayPosition) * 100;
        }

        $sovChange = $visibilityChange;

        return [
            'visibility_trend'  => $visibilityChange > 1  ? 'up' : ($visibilityChange < -1  ? 'down' : 'stable'),
            'sov_trend'         => $sovChange > 1          ? 'up' : ($sovChange < -1          ? 'down' : 'stable'),
            'sentiment_trend'   => $sentimentChange > 2   ? 'up' : ($sentimentChange < -2   ? 'down' : 'stable'),
            'position_trend'    => $positionChange > 1    ? 'up' : ($positionChange < -1    ? 'down' : 'stable'),
            'visibility_change' => round($visibilityChange, 1),
            'sov_change'        => round($sovChange, 1),
            'sentiment_change'  => round($sentimentChange, 1),
            'position_change'   => round($positionChange, 1),
        ];
    }

    /**
     * Get historical visibility data based on brand mentions
     */
    public function getHistoricalMentionVisibility(Brand $brand, ?int $days = 30, ?int $aiModelId = null, string $timezone = '+00:00'): array
    {
        $startDate = now()->subDays($days);
        $endDate = now()->endOfDay();

        // Get daily aggregated mention data (competitor_id included for override matching)
        $dailyStatsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}')) as date"),
                'entity_type',
                'entity_name',
                'entity_domain',
                'competitor_id',
                DB::raw('SUM(mention_count) as total_mentions')
            )
            ->groupBy(DB::raw("DATE(CONVERT_TZ(analyzed_at, '+00:00', '{$timezone}'))"), 'entity_type', 'entity_name', 'entity_domain', 'competitor_id');

        if ($aiModelId) {
            $dailyStatsQuery->where('ai_model_id', $aiModelId);
        }

        $dailyStats = $dailyStatsQuery->get();

        if ($dailyStats->isEmpty()) {
            // Fall back to existing historical stats, then ensure all competitors are present
            $historicalData = $this->getHistoricalStatsForChart($brand, $days, $aiModelId, $timezone);
            return $this->fillMissingCompetitorsInChartData($brand, $historicalData);
        }

        // Calculate Daily Totals (Brand + All Competitors) for Share of Voice
        $dailyTotals = [];
        foreach ($dailyStats as $stat) {
            $date = $stat->date;
            if (!isset($dailyTotals[$date])) {
                $dailyTotals[$date] = 0;
            }
            $dailyTotals[$date] += $stat->total_mentions;
        }

        // Calculate daily visibility percentages.
        // Also build a reverse map: date|domain → entity key (competitor_id or 'brand')
        // used later to match override rows by competitor_id without relying on domain strings.
        $historicalData   = [];
        $domainToEntityKey = []; // "date|domain" => "c_{id}" or "brand"

        foreach ($dailyStats as $stat) {
            $date = $stat->date;
            $totalDailyMentions = $dailyTotals[$date] ?? 0;

            // Share of Voice calculation: (Entity Mentions / Total Market Mentions) * 100
            $visibility = $totalDailyMentions > 0
                ? ($stat->total_mentions / $totalDailyMentions) * 100
                : 0;

            $domain    = $stat->entity_domain ?? $stat->entity_name;
            $entityKey = $stat->competitor_id ? 'c_'.$stat->competitor_id : 'brand';

            if (! isset($historicalData[$date])) {
                $historicalData[$date] = [];
            }

            $historicalData[$date][$domain] = [
                'entity_name' => $stat->entity_name,
                'visibility'  => round($visibility, 2),
                'sentiment'   => 50,
                'position'    => 5,
            ];

            $domainToEntityKey[$date.'|'.$domain] = $entityKey;
        }

        // Sort by date
        ksort($historicalData);

        // If we have mention-based data, merge with existing stats for sentiment/position
        if (! empty($historicalData)) {
            $existingStats = $this->getHistoricalStatsForChart($brand, $days, $aiModelId, $timezone);

            // Only fill in entirely missing dates from existing stats.
            // Do NOT inject old brand_competitive_stats visibility for entities that had zero
            // mentions on a date that already has brand_mentions data — that would mix two
            // incompatible data sources and cause chart/trend inconsistency.
            foreach ($existingStats as $date => $domains) {
                if (! isset($historicalData[$date])) {
                    $historicalData[$date] = $domains;
                }
            }

            // Then update sentiment/position for mention-based records
            foreach ($historicalData as $date => &$dateData) {
                foreach ($dateData as $domain => &$entityData) {
                    // Try to get sentiment/position from existing stats
                    if (isset($existingStats[$date][$domain])) {
                        // Only update if these are the default values from calculation
                        if (($entityData['sentiment'] == 50 && $entityData['position'] == 5) || 
                            (!isset($entityData['sentiment']) || !isset($entityData['position']))) {
                            $entityData['sentiment'] = $existingStats[$date][$domain]['sentiment'] ?? 50;
                            $entityData['position'] = $existingStats[$date][$domain]['position'] ?? 5;
                        }
                    }
                }
            }

            // Re-sort by date as we might have added new dates
            ksort($historicalData);
        }

        // Apply manual overrides on top of the SOV-computed values.
        // Match by competitor_id (reliable foreign key) rather than domain strings.
        // Build override map: "date|entityKey" => visibility
        $overrideMap = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('is_manual_override', true)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->orderBy('id') // later row wins for same date+entity
            ->get()
            ->mapWithKeys(function ($s) use ($timezone) {
                $date      = $s->analyzed_at->copy()->setTimezone($timezone)->format('Y-m-d');
                $entityKey = $s->competitor_id ? 'c_'.$s->competitor_id : 'brand';
                return [$date.'|'.$entityKey => round((float) $s->visibility, 2)];
            });

        foreach ($historicalData as $date => &$dateData) {
            foreach ($dateData as $domain => &$entityData) {
                $lookupKey = $date.'|'.($domainToEntityKey[$date.'|'.$domain] ?? null);
                if ($overrideMap->has($lookupKey)) {
                    $entityData['visibility'] = $overrideMap->get($lookupKey);
                }
            }
        }
        unset($dateData, $entityData);

        return $this->fillMissingCompetitorsInChartData($brand, $historicalData);
    }

    /**
     * Ensure every accepted competitor appears in every date slot of chart data.
     * Competitors absent from a date get a 0% visibility entry so the graph
     * renders a flat line rather than omitting the series entirely.
     *
     * @param  array  $chartData  { 'YYYY-MM-DD' => { 'domain' => [...] } }
     * @return array
     */
    protected function fillMissingCompetitorsInChartData(object $brand, array $chartData): array
    {
        if (empty($chartData)) {
            return $chartData;
        }

        $acceptedCompetitors = $brand->competitors()->accepted()->get();

        foreach ($chartData as $date => &$dateData) {
            foreach ($acceptedCompetitors as $competitor) {
                if (empty($competitor->domain)) {
                    continue;
                }

                // Normalise domain the same way the rest of the service does
                $cleanDomain = explode('/', preg_replace('#^https?://(www\.)?#', '', strtolower($competitor->domain)))[0];

                if (! isset($dateData[$cleanDomain])) {
                    $dateData[$cleanDomain] = [
                        'entity_name' => $competitor->name,
                        'visibility'  => 0,
                        'sentiment'   => null,
                        'position'    => 5,
                    ];
                }
            }
        }
        unset($dateData);

        return $chartData;
    }

    /**
     * Append 0% placeholder rows for any accepted competitor not already present in $stats.
     * Used by getMentionBasedVisibility() fallback paths so the BVI table always shows
     * the full accepted-competitor set, matching what fillMissingCompetitorsInChartData()
     * guarantees for the graph.
     */
    private function appendMissingAcceptedCompetitors(
        Brand $brand,
        array $stats,
        int $days,
        ?int $aiModelId,
        string $timezone
    ): array {
        $presentIds = collect($stats)
            ->where('entity_type', 'competitor')
            ->pluck('competitor_id')
            ->filter()
            ->values()
            ->all();

        // Recalculate trends for all existing entries using calculateTrendsForEntity.
        // The model's getTrends() used by buildFallbackStats has a <= 2 dates guard and
        // a different formula, so it can return 'new' even when a clear trend is visible.
        foreach ($stats as &$stat) {
            $cid = isset($stat['competitor_id']) ? ($stat['competitor_id'] ?: null) : null;
            $stat['trends'] = $this->calculateTrendsForEntity(
                $brand,
                $stat['entity_type'],
                $cid,
                $days,
                $aiModelId,
                null,
                $timezone
            );
        }
        unset($stat);

        foreach ($brand->competitors()->accepted()->get() as $competitor) {
            if (in_array($competitor->id, $presentIds)) {
                continue;
            }
            $stats[] = [
                'id'                    => $competitor->id,
                'competitor_id'         => $competitor->id,
                'entity_type'           => 'competitor',
                'entity_name'           => $competitor->name,
                'entity_url'            => $competitor->domain
                    ? 'https://'.explode('/', preg_replace('#^https?://(www\.)?#', '', strtolower($competitor->domain)))[0]
                    : '',
                'visibility'            => 0,
                'sov'                   => 0,
                'sentiment'             => null,
                'position'              => 0,
                'analyzed_at'           => now()->toDateTimeString(),
                'trends'                => $this->calculateTrendsForEntity($brand, 'competitor', $competitor->id, $days, $aiModelId, null, $timezone),
                'visibility_percentage' => '0%',
                'sov_percentage'        => '0%',
                'position_formatted'    => '#0',
                'sentiment_level'       => 'N/A',
                'mention_data'          => [
                    'prompts_mentioned'  => 0,
                    'total_prompts'      => 0,
                    'total_mentions'     => 0,
                    'total_all_mentions' => 0,
                    'share_of_voice'     => 0,
                ],
            ];
        }

        usort($stats, fn ($a, $b) => $b['visibility'] <=> $a['visibility']);
        return $stats;
    }
}
