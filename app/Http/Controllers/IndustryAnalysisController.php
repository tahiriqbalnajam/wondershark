<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\IndustryAnalysis;
use App\Models\AiApiResponse;
use App\Models\AiModel;
use App\Jobs\ProcessIndustryAnalysis;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class IndustryAnalysisController extends Controller
{
    /**
     * Get enabled AI providers from database
     */
    private function getEnabledAiProviders()
    {
        return AiModel::enabled()->ordered()->get();
    }
    
    /**
     * Display the search analytics page
     */
    public function index(Request $request)
    {
        $analyses = IndustryAnalysis::with(['post', 'user', 'aiResponses'])
            ->when($request->status, function ($query, $status) {
                return $query->byStatus($status);
            })
            ->when($request->country, function ($query, $country) {
                return $query->byCountry($country);
            })
            ->latest()
            ->paginate(10);

        return Inertia::render('SearchAnalytics/Index', [
            'analyses' => $analyses,
            'filters' => $request->only(['status', 'country']),
        ]);
    }

    /**
     * Show specific analysis results
     */
    public function show(IndustryAnalysis $analysis)
    {
        $analysis->load(['post', 'user', 'aiResponses']);
        
        return Inertia::render('SearchAnalytics/Show', [
            'analysis' => $analysis,
            'progressPercentage' => $analysis->getProgressPercentage(),
        ]);
    }

    /**
     * Start industry analysis for a post
     */
    public function store(Request $request)
    {
        $request->validate([
            'post_id' => 'required|exists:posts,id',
            'country' => 'sometimes|string|max:2',
        ]);

        $post = Post::findOrFail($request->post_id);
        
        // Extract URL from post (assuming URL is in post content or has a url field)
        $targetUrl = $this->extractUrlFromPost($post);
        
        if (!$targetUrl) {
            return response()->json(['error' => 'No URL found in the post'], 400);
        }

        // Create industry analysis record
        $analysis = IndustryAnalysis::create([
            'post_id' => $post->id,
            'user_id' => Auth::id(),
            'target_url' => $targetUrl,
            'country' => $request->country ?? 'US',
            'status' => 'pending',
        ]);

        // Start AI analysis process
        $this->startAiAnalysis($analysis);

        return response()->json([
            'message' => 'Industry analysis started successfully',
            'analysis_id' => $analysis->id,
        ]);
    }

    /**
     * Start the AI analysis process
     */
    private function startAiAnalysis(IndustryAnalysis $analysis)
    {
        $aiProviders = $this->getEnabledAiProviders();
        
        foreach ($aiProviders as $aiModel) {
            ProcessIndustryAnalysis::dispatch($analysis, $aiModel);
        }
    }

    /**
     * Process AI analysis for a specific provider
     */
    private function processAiProvider(IndustryAnalysis $analysis, AiModel $aiModel)
    {
        try {
            // Create AI response record
            $aiResponse = AiApiResponse::create([
                'industry_analysis_id' => $analysis->id,
                'ai_provider' => $aiModel->name,
                'prompt_used' => $this->getPromptForProvider($aiModel, $analysis),
                'status' => 'processing',
            ]);

            $startTime = microtime(true);
            
            // Make API call based on provider
            $response = $this->callAiProvider($aiModel, $aiResponse->prompt_used);
            
            $processingTime = microtime(true) - $startTime;

            if ($response['success']) {
                // Parse the response
                $parsedData = $this->parseAiResponse($aiModel->name, $response['data']);
                
                // Update AI response record
                $aiResponse->update([
                    'raw_response' => $response['data'],
                    'parsed_data' => $parsedData,
                    'status' => 'completed',
                    'processing_time' => $processingTime,
                    'tokens_used' => $response['tokens_used'] ?? 0,
                    'cost_estimate' => $this->calculateCost($aiModel->name, $response['tokens_used'] ?? 0),
                ]);
            } else {
                $aiResponse->update([
                    'status' => 'error',
                    'error_message' => $response['error'],
                    'processing_time' => $processingTime,
                ]);
            }

            // Check if all AI responses are completed
            $this->checkAnalysisCompletion($analysis);

        } catch (\Exception $e) {
            Log::error("AI Provider Error: {$aiModel->name}", [
                'analysis_id' => $analysis->id,
                'provider' => $aiModel->name,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generate prompt for specific AI provider
     */
    private function getPromptForProvider(AiModel $aiModel, IndustryAnalysis $analysis): string
    {
        $basePrompt = "Analyze the website {$analysis->target_url} and provide:
        1. Industry rankings and competitive position
        2. Top authoritative sources in this industry
        3. Brand sentiment analysis
        4. Market share insights
        5. Key competitors and their positions
        
        Focus on the {$analysis->country} market.
        
        Please provide structured data with specific rankings, source URLs, and sentiment scores.";

        switch ($aiModel->name) {
            case 'openai':
                return $basePrompt . "\n\nProvide response in JSON format with clear categories.";
            case 'gemini':
                return $basePrompt . "\n\nInclude confidence scores for each insight.";
            case 'perplexity':
                return $basePrompt . "\n\nFocus on real-time data and cite all sources.";
            default:
                return $basePrompt;
        }
    }

    /**
     * Call AI provider API
     */
    private function callAiProvider(AiModel $aiModel, string $prompt): array
    {
        try {
            switch ($aiModel->name) {
                case 'openai':
                    return $this->callOpenAI($aiModel, $prompt);
                case 'gemini':
                    return $this->callGemini($aiModel, $prompt);
                case 'perplexity':
                    return $this->callPerplexity($aiModel, $prompt);
                default:
                    return ['success' => false, 'error' => 'Unknown provider'];
            }
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Call OpenAI API
     */
    private function callOpenAI(AiModel $aiModel, string $prompt): array
    {
        $config = $aiModel->api_config;
        
        if (empty($config['api_key'])) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $config['api_key'],
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $config['model'] ?? 'gpt-4',
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'max_tokens' => $config['max_tokens'] ?? 2000,
        ]);

        if ($response->successful()) {
            $data = $response->json();
            return [
                'success' => true,
                'data' => $data['choices'][0]['message']['content'],
                'tokens_used' => $data['usage']['total_tokens'],
            ];
        }

        return ['success' => false, 'error' => $response->body()];
    }

    /**
     * Call Gemini API
     */
    private function callGemini(AiModel $aiModel, string $prompt): array
    {
        $config = $aiModel->api_config;
        
        if (empty($config['api_key'])) {
            return ['success' => false, 'error' => 'Gemini API key not configured'];
        }

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->post('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' . $config['api_key'], [
            'contents' => [
                ['parts' => [['text' => $prompt]]]
            ],
        ]);

        if ($response->successful()) {
            $data = $response->json();
            return [
                'success' => true,
                'data' => $data['candidates'][0]['content']['parts'][0]['text'],
                'tokens_used' => $data['usageMetadata']['totalTokenCount'] ?? 0,
            ];
        }

        return ['success' => false, 'error' => $response->body()];
    }

    /**
     * Call Perplexity API
     */
    private function callPerplexity(AiModel $aiModel, string $prompt): array
    {
        $config = $aiModel->api_config;
        
        if (empty($config['api_key'])) {
            return ['success' => false, 'error' => 'Perplexity API key not configured'];
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $config['api_key'],
            'Content-Type' => 'application/json',
        ])->post('https://api.perplexity.ai/chat/completions', [
            'model' => $config['model'] ?? 'llama-3.1-sonar-small-128k-online',
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'max_tokens' => $config['max_tokens'] ?? 2000,
        ]);

        if ($response->successful()) {
            $data = $response->json();
            return [
                'success' => true,
                'data' => $data['choices'][0]['message']['content'],
                'tokens_used' => $data['usage']['total_tokens'] ?? 0,
            ];
        }

        return ['success' => false, 'error' => $response->body()];
    }

    /**
     * Parse AI response based on provider
     */
    private function parseAiResponse(string $provider, string $response): array
    {
        // Basic parsing - in production, you'd want more sophisticated parsing
        return [
            'provider' => $provider,
            'raw_content' => $response,
            'parsed_at' => now()->toISOString(),
            'industry_mentions' => $this->extractIndustryMentions($response),
            'source_mentions' => $this->extractSourceMentions($response),
            'sentiment_score' => $this->calculateSentiment($response),
        ];
    }

    /**
     * Extract industry mentions from response
     */
    private function extractIndustryMentions(string $response): array
    {
        // Simple regex-based extraction - enhance with NLP in production
        preg_match_all('/industry|sector|market|business/i', $response, $matches);
        return array_unique($matches[0]);
    }

    /**
     * Extract source mentions from response
     */
    private function extractSourceMentions(string $response): array
    {
        // Extract URLs and source citations
        preg_match_all('/https?:\/\/[^\s\)]+/i', $response, $urls);
        preg_match_all('/according to ([^,.]+)/i', $response, $sources);
        
        return [
            'urls' => array_unique($urls[0] ?? []),
            'sources' => array_unique($sources[1] ?? []),
        ];
    }

    /**
     * Calculate basic sentiment score
     */
    private function calculateSentiment(string $response): float
    {
        $positive = ['good', 'excellent', 'strong', 'leader', 'top', 'best'];
        $negative = ['poor', 'weak', 'declining', 'worst', 'bad', 'failing'];
        
        $positiveCount = 0;
        $negativeCount = 0;
        
        foreach ($positive as $word) {
            $positiveCount += substr_count(strtolower($response), $word);
        }
        
        foreach ($negative as $word) {
            $negativeCount += substr_count(strtolower($response), $word);
        }
        
        $total = $positiveCount + $negativeCount;
        
        if ($total === 0) return 0.5; // Neutral
        
        return $positiveCount / $total;
    }

    /**
     * Calculate API cost estimate
     */
    private function calculateCost(string $provider, int $tokens): float
    {
        $rates = [
            'openai' => 0.03 / 1000,    // $0.03 per 1K tokens
            'gemini' => 0.00025 / 1000, // $0.00025 per 1K tokens
            'perplexity' => 0.005 / 1000, // $0.005 per 1K tokens
        ];

        return ($rates[$provider] ?? 0.01) * $tokens;
    }

    /**
     * Check if analysis is completed and aggregate results
     */
    private function checkAnalysisCompletion(IndustryAnalysis $analysis)
    {
        $totalResponses = $analysis->aiResponses()->count();
        $completedResponses = $analysis->completedResponses()->count();

        if ($completedResponses === $totalResponses) {
            // Aggregate results
            $this->aggregateResults($analysis);
            
            $analysis->update(['status' => 'completed']);
        }
    }

    /**
     * Aggregate results from all AI providers
     */
    private function aggregateResults(IndustryAnalysis $analysis)
    {
        $responses = $analysis->completedResponses()->get();
        
        $industryRankings = [];
        $topSources = [];
        $overallSentiment = 0;
        
        foreach ($responses as $response) {
            $parsed = $response->parsed_data;
            
            // Aggregate industry mentions
            $industryRankings = array_merge(
                $industryRankings, 
                $parsed['industry_mentions'] ?? []
            );
            
            // Aggregate sources
            $topSources = array_merge(
                $topSources, 
                $parsed['source_mentions']['sources'] ?? []
            );
            
            // Average sentiment
            $overallSentiment += $parsed['sentiment_score'] ?? 0.5;
        }
        
        $analysis->update([
            'industry_rankings' => array_count_values($industryRankings),
            'top_sources' => array_count_values($topSources),
            'metadata' => [
                'overall_sentiment' => $overallSentiment / $responses->count(),
                'analysis_completed_at' => now()->toISOString(),
                'providers_used' => $responses->pluck('ai_provider')->toArray(),
            ],
        ]);
    }

    /**
     * Extract URL from post content
     */
    private function extractUrlFromPost(Post $post): ?string
    {
        // Post model has a 'url' field
        return $post->url;
    }
}
