<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Models\BrandMention;
use App\Models\BrandPrompt;
use App\Models\Competitor;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VisibilityCalculationService
{
    /**
     * Extract and log brand mentions from an AI response
     */
    public function extractAndLogMentions(
        BrandPrompt $brandPrompt,
        Brand $brand,
        string $aiResponse,
        ?int $aiModelId = null,
        ?string $sessionId = null
    ): array {
        $mentions = [];
        $sessionId = $sessionId ?? Str::uuid()->toString();
        $analyzedAt = now();

        // Get the brand domain for matching
        $brandDomain = $this->extractDomain($brand->website);
        $brandNames = $this->getBrandSearchTerms($brand);

        // Check if the brand itself is mentioned
        $brandMentionData = $this->findMentionsInText($aiResponse, $brandNames, $brandDomain);

        if ($brandMentionData['found']) {
            $mention = BrandMention::create([
                'brand_prompt_id' => $brandPrompt->id,
                'brand_id' => $brand->id,
                'ai_model_id' => $aiModelId,
                'entity_type' => 'brand',
                'competitor_id' => null,
                'entity_name' => $brand->name,
                'entity_domain' => $brandDomain,
                'mention_count' => $brandMentionData['count'],
                'position' => $brandMentionData['first_position'],
                'context' => $brandMentionData['context'],
                'session_id' => $sessionId,
                'analyzed_at' => $analyzedAt,
                'sentiment' => $brandPrompt->sentiment ?? 50,
            ]);
            $mentions[] = $mention;
        }

        // Get accepted competitors and check their mentions
        $competitors = $brand->competitors()->accepted()->get();

        $compMentionsRaw = $brandPrompt->competitor_mentions;
        $compMentionsData = is_string($compMentionsRaw) ? json_decode($compMentionsRaw, true) : (is_array($compMentionsRaw) ? $compMentionsRaw : []);

        foreach ($competitors as $competitor) {
            $competitorDomain = $this->extractDomain($competitor->domain);
            $competitorNames = $this->getCompetitorSearchTerms($competitor);

            $competitorMentionData = $this->findMentionsInText($aiResponse, $competitorNames, $competitorDomain);

            if ($competitorMentionData['found']) {
                $compSentiment = null;
                if ($compMentionsData && isset($compMentionsData[$competitor->name]) && isset($compMentionsData[$competitor->name]['sentiment'])) {
                    $compSentimentVal = $compMentionsData[$competitor->name]['sentiment'];
                    if (is_numeric($compSentimentVal)) {
                        $compSentiment = (int)$compSentimentVal;
                    }
                }

                $mention = BrandMention::create([
                    'brand_prompt_id' => $brandPrompt->id,
                    'brand_id' => $brand->id,
                    'ai_model_id' => $aiModelId,
                    'entity_type' => 'competitor',
                    'competitor_id' => $competitor->id,
                    'entity_name' => $competitor->name,
                    'entity_domain' => $competitorDomain,
                    'mention_count' => $competitorMentionData['count'],
                    'position' => $competitorMentionData['first_position'],
                    'context' => $competitorMentionData['context'],
                    'session_id' => $sessionId,
                    'analyzed_at' => $analyzedAt,
                    'sentiment' => $compSentiment, // Assigned from AI analysis if available
                ]);
                $mentions[] = $mention;
            }
        }

        Log::info('Extracted brand mentions from AI response', [
            'brand_prompt_id' => $brandPrompt->id,
            'brand_id' => $brand->id,
            'session_id' => $sessionId,
            'total_mentions' => count($mentions),
            'brand_mentioned' => $brandMentionData['found'],
        ]);

        return $mentions;
    }

    /**
     * Calculate visibility percentages for a brand based on mention data
     *
     * Visibility = (number of chats mentioning entity / total chats for those prompts) * 100
     */
    public function calculateVisibility(
        Brand $brand,
        ?Carbon $startDate = null,
        ?Carbon $endDate = null,
        ?int $aiModelId = null,
        ?string $sessionId = null
    ): array {
        $startDate = $startDate ?? now()->subDays(30);
        $endDate = $endDate ?? now();

        // Get total unique prompts analyzed in the time window
        $totalPromptsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->distinct('brand_prompt_id');

        if ($aiModelId) {
            $totalPromptsQuery->where('ai_model_id', $aiModelId);
        }

        $totalPrompts = $totalPromptsQuery->count('brand_prompt_id');

        if ($totalPrompts === 0) {
            Log::warning('No prompts found for visibility calculation', [
                'brand_id' => $brand->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            return [];
        }

        // Calculate visibility for each entity (brand + competitors)
        $visibilityStats = [];

        // Get mention counts grouped by entity
        $mentionStatsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                'entity_type',
                'entity_name',
                'entity_domain',
                'competitor_id',
                DB::raw('COUNT(DISTINCT brand_prompt_id) as prompts_mentioned'),
                DB::raw('SUM(mention_count) as total_mentions'),
                DB::raw('AVG(position) as avg_position'),
                DB::raw('AVG(sentiment) as avg_sentiment')
            )
            ->groupBy('entity_type', 'entity_name', 'entity_domain', 'competitor_id');

        if ($aiModelId) {
            $mentionStatsQuery->where('ai_model_id', $aiModelId);
        }

        $mentionStats = $mentionStatsQuery->get();

        // Calculate total mentions across ALL entities for share of voice
        $totalMentionsAllEntities = $mentionStats->sum('total_mentions');

        foreach ($mentionStats as $stat) {
            // Visibility = Presence Frequency (percentage of prompts where entity appeared)
            $visibility = $totalPrompts > 0
                ? ($stat->prompts_mentioned / $totalPrompts) * 100
                : 0;

            $visibilityStats[] = [
                'entity_type' => $stat->entity_type,
                'entity_name' => $stat->entity_name,
                'entity_domain' => $stat->entity_domain,
                'competitor_id' => $stat->competitor_id,
                'visibility' => round($visibility, 2),
                'prompts_mentioned' => $stat->prompts_mentioned,
                'total_prompts' => $totalPrompts,
                'total_mentions' => $stat->total_mentions,
                'total_all_entities' => $totalMentionsAllEntities,
                'avg_position' => round($stat->avg_position ?? 0, 1),
                'avg_sentiment' => $stat->avg_sentiment,
            ];
        }

        // Sort by visibility descending
        usort($visibilityStats, fn ($a, $b) => $b['visibility'] <=> $a['visibility']);

        Log::info('Calculated visibility for brand', [
            'brand_id' => $brand->id,
            'total_prompts' => $totalPrompts,
            'total_mentions_all' => $totalMentionsAllEntities,
            'entities_count' => count($visibilityStats),
        ]);

        return $visibilityStats;
    }

    /**
     * Update BrandCompetitiveStat records with calculated visibility
     */
    public function updateCompetitiveStats(
        Brand $brand,
        ?Carbon $startDate = null,
        ?Carbon $endDate = null,
        ?int $aiModelId = null,
        ?string $sessionId = null
    ): array {
        $sessionId = $sessionId ?? Str::uuid()->toString();
        $visibilityStats = $this->calculateVisibility($brand, $startDate, $endDate, $aiModelId);

        if (empty($visibilityStats)) {
            return [];
        }

        $updatedStats = [];
        $analyzedAt = now();

        foreach ($visibilityStats as $stat) {
            $entityUrl = $stat['entity_domain']
                ? 'https://'.$stat['entity_domain']
                : ($stat['entity_type'] === 'brand' ? ($brand->website ?? 'https://unknown.com') : 'https://unknown.com');

            // Cap position at 10.0 (the column is DECIMAL(3,1) which maxes at 99.9, but we want 1-10 scale)
            $position = min(10.0, max(1.0, ($stat['avg_position'] ?? 500) / 100));

            // Create new competitive stat (always create new records for historical tracking)
            $competitiveStat = BrandCompetitiveStat::create([
                'brand_id' => $brand->id,
                'entity_type' => $stat['entity_type'],
                'competitor_id' => $stat['competitor_id'],
                'ai_model_id' => $aiModelId, // Ensure ai_model_id is saved
                'entity_name' => $stat['entity_name'],
                'entity_url' => $entityUrl,
                'visibility' => $stat['visibility'],
                'sentiment' => $stat['avg_sentiment'] !== null ? (int) round($stat['avg_sentiment']) : null,
                'position' => $position,
                'analysis_session_id' => $sessionId,
                'analyzed_at' => $analyzedAt,
                'raw_data' => [
                    'prompts_mentioned' => $stat['prompts_mentioned'],
                    'total_prompts' => $stat['total_prompts'],
                    'total_mentions' => $stat['total_mentions'],
                    'calculation_method' => 'presence_based',
                ],
            ]);

            $updatedStats[] = $competitiveStat;
        }

        Log::info('Updated competitive stats with visibility', [
            'brand_id' => $brand->id,
            'stats_updated' => count($updatedStats),
            'session_id' => $sessionId,
        ]);

        return $updatedStats;
    }

    /**
     * Get historical visibility data for charting
     */
    public function getHistoricalVisibility(
        Brand $brand,
        ?Carbon $startDate = null,
        ?Carbon $endDate = null,
        ?int $aiModelId = null
    ): array {
        $startDate = $startDate ?? now()->subDays(30);
        $endDate = $endDate ?? now();

        // Get daily aggregated mention data
        $dailyStatsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                DB::raw('DATE(analyzed_at) as date'),
                'entity_type',
                'entity_name',
                'entity_domain',
                DB::raw('COUNT(DISTINCT brand_prompt_id) as prompts_mentioned')
            )
            ->groupBy(DB::raw('DATE(analyzed_at)'), 'entity_type', 'entity_name', 'entity_domain');

        if ($aiModelId) {
            $dailyStatsQuery->where('ai_model_id', $aiModelId);
        }

        $dailyStats = $dailyStatsQuery->get();

        // Get daily total prompts
        $dailyTotalsQuery = BrandMention::where('brand_id', $brand->id)
            ->whereBetween('analyzed_at', [$startDate, $endDate])
            ->select(
                DB::raw('DATE(analyzed_at) as date'),
                DB::raw('COUNT(DISTINCT brand_prompt_id) as total_prompts')
            )
            ->groupBy(DB::raw('DATE(analyzed_at)'));

        if ($aiModelId) {
            $dailyTotalsQuery->where('ai_model_id', $aiModelId);
        }

        $dailyTotals = $dailyTotalsQuery->pluck('total_prompts', 'date');

        // Calculate daily visibility percentages
        $historicalData = [];

        foreach ($dailyStats as $stat) {
            $date = $stat->date;
            $totalPrompts = $dailyTotals[$date] ?? 0;

            if ($totalPrompts === 0) {
                continue;
            }

            $visibility = ($stat->prompts_mentioned / $totalPrompts) * 100;
            $domain = $stat->entity_domain ?? $stat->entity_name;

            if (! isset($historicalData[$date])) {
                $historicalData[$date] = [];
            }

            $historicalData[$date][$domain] = [
                'visibility' => round($visibility, 2),
                'entity_name' => $stat->entity_name,
                'entity_type' => $stat->entity_type,
                'prompts_mentioned' => $stat->prompts_mentioned,
                'total_prompts' => $totalPrompts,
            ];
        }

        // Sort by date
        ksort($historicalData);

        return $historicalData;
    }

    /**
     * Find mentions of search terms in text
     */
    protected function findMentionsInText(string $text, array $searchTerms, ?string $domain = null): array
    {
        $textLower = strtolower($text);
        $found = false;
        $count = 0;
        $firstPosition = null;
        $context = null;

        // Search for name variations
        foreach ($searchTerms as $term) {
            $termLower = strtolower($term);
            $termCount = substr_count($textLower, $termLower);

            if ($termCount > 0) {
                $found = true;
                $count += $termCount;

                // Find first position
                if ($firstPosition === null) {
                    $pos = strpos($textLower, $termLower);
                    if ($pos !== false) {
                        $firstPosition = $pos;
                        // Extract context (100 chars before and after)
                        $start = max(0, $pos - 100);
                        $length = min(strlen($text), $pos + strlen($term) + 100) - $start;
                        $context = substr($text, $start, $length);
                    }
                }
            }
        }

        // Also search for domain
        if ($domain && ! $found) {
            $domainLower = strtolower($domain);
            $domainCount = substr_count($textLower, $domainLower);

            if ($domainCount > 0) {
                $found = true;
                $count += $domainCount;

                $pos = strpos($textLower, $domainLower);
                if ($pos !== false) {
                    $firstPosition = $pos;
                    $start = max(0, $pos - 100);
                    $length = min(strlen($text), $pos + strlen($domain) + 100) - $start;
                    $context = substr($text, $start, $length);
                }
            }
        }

        return [
            'found' => $found,
            'count' => $count,
            'first_position' => $firstPosition,
            'context' => $context ? $this->sanitizeUtf8($context) : null,
        ];
    }

    /**
     * Sanitize string to valid UTF-8
     */
    protected function sanitizeUtf8(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // Remove invalid UTF-8 characters
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

        // Remove any remaining non-printable characters except newlines/tabs
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        return $text;
    }

    /**
     * Get search terms for a brand
     */
    protected function getBrandSearchTerms(Brand $brand): array
    {
        $terms = [$brand->name];

        // Add domain without extension
        if ($brand->website) {
            $domain = $this->extractDomain($brand->website);
            if ($domain) {
                $terms[] = $domain;
                // Add domain without TLD
                $parts = explode('.', $domain);
                if (count($parts) > 1) {
                    $terms[] = $parts[0];
                }
            }
        }

        return array_unique(array_filter($terms));
    }

    /**
     * Get search terms for a competitor
     */
    protected function getCompetitorSearchTerms(Competitor $competitor): array
    {
        $terms = [$competitor->name];

        // Add tracked name if different
        if ($competitor->trackedName && $competitor->trackedName !== $competitor->name) {
            $terms[] = $competitor->trackedName;
        }

        // Add domain without extension
        if ($competitor->domain) {
            $domain = $this->extractDomain($competitor->domain);
            if ($domain) {
                $terms[] = $domain;
                // Add domain without TLD
                $parts = explode('.', $domain);
                if (count($parts) > 1) {
                    $terms[] = $parts[0];
                }
            }
        }

        return array_unique(array_filter($terms));
    }

    /**
     * Extract clean domain from URL
     */
    protected function extractDomain(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $url = strtolower($url);

        // Remove protocol
        $url = preg_replace('#^https?://#', '', $url);

        // Remove www
        $url = preg_replace('#^www\.#', '', $url);

        // Remove path
        $parts = explode('/', $url);

        return $parts[0] ?? null;
    }
    /**
     * Convert sentiment value to a clean 0-100 integer score.
     * Sentiment is now stored as an integer (0-100) in BrandPrompt.
     * This method is kept for backward compatibility with any legacy string values.
     *
     * @deprecated Use $brandPrompt->sentiment directly (already an integer cast).
     */
    protected function getSentimentScore(mixed $sentiment): int
    {
        if ($sentiment === null) {
            return 50;
        }

        // Already a number — just clamp and return
        if (is_numeric($sentiment)) {
            $score = (float) $sentiment;
            // If it looks like a 1-10 scale, convert
            if ($score <= 10) {
                $score *= 10;
            }
            return (int) max(0, min(100, round($score)));
        }

        // Legacy text label fallback
        $lower = strtolower(trim((string) $sentiment));
        return match (true) {
            str_contains($lower, 'very positive') || str_contains($lower, 'excellent') => 90,
            str_contains($lower, 'positive')                                            => 75,
            str_contains($lower, 'very negative') || str_contains($lower, 'poor')      => 15,
            str_contains($lower, 'negative')                                            => 30,
            default                                                                      => 50,
        };
    }
}
