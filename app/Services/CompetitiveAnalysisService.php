<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Models\AiModel;
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
    public function analyzeBrandCompetitiveStats(Brand $brand, string $sessionId = null): array
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
            $competitorUrls = $competitors->pluck('domain')->map(function($domain) {
                return str_starts_with($domain, 'http') ? $domain : 'https://' . $domain;
            })->toArray();
            
            // Generate analysis prompt
            $prompt = $this->buildCompetitiveAnalysisPrompt($brand->website, $competitorUrls, $brand->name);
            
            // Get AI analysis
            $analysis = $this->callAIForAnalysis($prompt);
            
            if (!$analysis) {
                throw new \Exception('Failed to get AI analysis');
            }

            // Parse and store brand stats
            $brandStats = $this->parseBrandStats($analysis, $brand, $sessionId);
            if ($brandStats) {
                $results[] = $brandStats;
            }

            // Parse and store competitor stats
            foreach ($competitors as $competitor) {
                $competitorStats = $this->parseCompetitorStats($analysis, $brand, $competitor, $sessionId);
                if ($competitorStats) {
                    $results[] = $competitorStats;
                }
            }

            Log::info("Competitive analysis completed for brand: {$brand->name}", [
                'session_id' => $sessionId,
                'results_count' => count($results)
            ]);

            return $results;

        } catch (\Exception $e) {
            Log::error("Competitive analysis failed for brand: {$brand->name}", [
                'error' => $e->getMessage(),
                'session_id' => $sessionId
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
            // Get the first available AI model
            $aiModel = AiModel::where('is_enabled', true)->first();
            
            if (!$aiModel) {
                throw new \Exception('No enabled AI model found');
            }

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
                            ['role' => 'user', 'content' => $prompt]
                        ],
                        'temperature' => 0.7,
                        'max_tokens' => 4000, // More tokens for detailed analysis
                    ]);
                
                if (!$response->successful()) {
                    throw new \Exception("OpenAI API error: " . $response->status() . " - " . $response->body());
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

            if (!$jsonMatch) {
                // Try alternative JSON extraction patterns
                $patterns = [
                    '/```json\s*(\{.*?\})\s*```/s',
                    '/```\s*(\{.*?\})\s*```/s',
                    '/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/s'
                ];
                
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $content, $matches)) {
                        $jsonMatch = $matches[1];
                        break;
                    }
                }
            }

            if (!$jsonMatch) {
                Log::error('No JSON found in AI response', ['response' => substr($content, 0, 500)]);
                throw new \Exception('No JSON found in AI response');
            }

            $analysis = json_decode($jsonMatch, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Invalid JSON in AI response', [
                    'error' => json_last_error_msg(),
                    'json' => substr($jsonMatch, 0, 500)
                ]);
                throw new \Exception('Invalid JSON in AI response: ' . json_last_error_msg());
            }

            return $analysis;

        } catch (\Exception $e) {
            Log::error('AI competitive analysis failed', [
                'error' => $e->getMessage(),
                'prompt_length' => strlen($prompt)
            ]);
            
            return null;
        }
    }

    /**
     * Parse and store brand stats from AI analysis
     */
    protected function parseBrandStats(array $analysis, Brand $brand, string $sessionId): ?BrandCompetitiveStat
    {
        if (!isset($analysis['brand_analysis'])) {
            Log::warning('Brand analysis not found in AI response');
            return null;
        }

        $brandData = $analysis['brand_analysis'];
        
        return BrandCompetitiveStat::create([
            'brand_id' => $brand->id,
            'entity_type' => 'brand',
            'competitor_id' => null,
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
    protected function parseCompetitorStats(array $analysis, Brand $brand, $competitor, string $sessionId): ?BrandCompetitiveStat
    {
        if (!isset($analysis['competitors_analysis']) || !is_array($analysis['competitors_analysis'])) {
            Log::warning('Competitors analysis not found in AI response');
            return null;
        }

        // Find matching competitor in analysis by URL matching
        foreach ($analysis['competitors_analysis'] as $competitorData) {
            $competitorUrl = $competitorData['url'] ?? '';
            $competitorDomain = str_starts_with($competitor->domain, 'http') ? $competitor->domain : 'https://' . $competitor->domain;
            $competitorHost = parse_url($competitorDomain, PHP_URL_HOST);
            
            if ($competitorHost && str_contains($competitorUrl, $competitorHost)) {
                return BrandCompetitiveStat::create([
                    'brand_id' => $brand->id,
                    'entity_type' => 'competitor',
                    'competitor_id' => $competitor->id,
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

        Log::warning("No matching competitor found in AI analysis", [
            'competitor_name' => $competitor->name,
            'competitor_domain' => $competitor->domain
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
    public function getLatestStatsWithTrends(Brand $brand): array
    {
        $stats = BrandCompetitiveStat::latestForBrand($brand->id)
            ->with(['competitor'])
            ->where(function($query) {
                // Include brand stats (entity_type = 'brand')
                $query->where('entity_type', 'brand')
                      // OR competitor stats where the competitor is accepted
                      ->orWhereHas('competitor', function($subQuery) {
                          $subQuery->accepted();
                      });
            })
            ->orderBy('entity_type')
            ->orderBy('entity_name')
            ->get();

        return $stats->map(function ($stat) {
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
            return $statArray;
        })->toArray();
    }

    /**
     * Check if brand needs analysis (hasn't been analyzed recently)
     */
    public function brandNeedsAnalysis(Brand $brand, int $hoursThreshold = 24): bool
    {
        $recentAnalysis = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('analyzed_at', '>', now()->subHours($hoursThreshold))
            ->exists();

        return !$recentAnalysis;
    }

    /**
     * Get brands that need competitive analysis
     */
    public function getBrandsNeedingAnalysis(int $hoursThreshold = 24): \Illuminate\Database\Eloquent\Collection
    {
        // Get brands that have accepted competitors with domains
        $brandsWithCompetitors = Brand::whereHas('competitors', function($query) {
            $query->accepted()->whereNotNull('domain');
        });

        // Filter out brands that have been analyzed recently
        $brandsNeedingAnalysis = $brandsWithCompetitors->whereDoesntHave('competitiveStats', function($query) use ($hoursThreshold) {
            $query->where('analyzed_at', '>', now()->subHours($hoursThreshold));
        });

        return $brandsNeedingAnalysis->get();
    }
}