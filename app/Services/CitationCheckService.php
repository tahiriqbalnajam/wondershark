<?php

namespace App\Services;

use App\Models\AiModel;
use App\Models\Post;
use App\Models\PostCitation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CitationCheckService
{
    // Provider names match the `name` column in ai_models table
    protected array $aiProviders = [
        'openai'     => 'OpenAI',
        'gemini'     => 'Gemini',
        'perplexity' => 'Perplexity',
    ];

    /**
     * Cache of loaded + enabled AI model configs, keyed by provider name.
     * Avoids repeated DB hits inside the hot loop.
     */
    protected array $providerConfigCache = [];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public function runCitationCheck(Post $post): array
    {
        // Pre-load all enabled provider configs in a single query
        $this->warmProviderCache();

        $selectedPrompts    = $this->getSelectedPrompts($post);
        $promptSelectionInfo = $this->getPromptSelectionInfo($post);

        if (empty($selectedPrompts)) {
            return [
                'success'              => false,
                'message'              => 'No selected prompts found for this post',
                'results'              => [],
                'prompt_selection_info' => $promptSelectionInfo,
            ];
        }

        $results               = [];

        foreach ($this->aiProviders as $provider => $displayName) {
            // Skip providers that are disabled or missing an API key (uses cache)
            if (! $this->isProviderReady($provider)) {
                Log::debug("Skipping disabled/unconfigured provider: {$provider}");
                continue;
            }

            try {
                $providerResult = $this->runProviderChecks($post, $selectedPrompts, $provider);

                $results[$provider] = $providerResult;

            } catch (\Exception $e) {
                Log::error("Citation check failed for {$provider}", [
                    'post_id' => $post->id,
                    'error'   => $e->getMessage(),
                ]);

                $results[$provider] = [
                    'success'      => false,
                    'error'        => $e->getMessage(),
                    'is_mentioned' => false,
                    'position'     => null,
                ];
            }
        }

        return [
            'success'               => true,
            'post_id'               => $post->id,
            'post_url'              => $post->url,
            'prompt_selection_info' => $promptSelectionInfo,
            'results'               => $results,
        ];
    }

    public function getBatchCitationResults(array $postIds): array
    {
        $this->warmProviderCache();

        $results = [];
        foreach ($postIds as $postId) {
            $post = Post::find($postId);
            if ($post) {
                $results[] = $this->runCitationCheck($post);
            }
        }

        return $results;
    }

    // -------------------------------------------------------------------------
    // Provider Config / Cache
    // -------------------------------------------------------------------------

    /**
     * Load all enabled AI models in one DB query and cache them.
     */
    protected function warmProviderCache(): void
    {
        if (! empty($this->providerConfigCache)) {
            return; // Already warmed
        }

        $models = AiModel::whereIn('name', array_keys($this->aiProviders))
            ->where('is_enabled', true)
            ->get()
            ->keyBy('name');

        foreach (array_keys($this->aiProviders) as $provider) {
            $this->providerConfigCache[$provider] = $models->get($provider);
        }
    }

    protected function getProviderConfig(string $provider): ?AiModel
    {
        if (empty($this->providerConfigCache)) {
            $this->warmProviderCache();
        }

        return $this->providerConfigCache[$provider] ?? null;
    }

    protected function isProviderReady(string $provider): bool
    {
        $config = $this->getProviderConfig($provider);

        return $config !== null && ! empty($config->api_config['api_key']);
    }

    // -------------------------------------------------------------------------
    // Prompt Selection
    // -------------------------------------------------------------------------

    /**
     * Get selected prompts for a post, capped at 25 with proportional distribution.
     * Returns only the prompt text strings.
     */
    protected function getSelectedPrompts(Post $post): array
    {
        $promptsByProvider = $post->prompts()
            ->where('is_selected', true)
            ->where('status', 'active')
            ->get(['ai_provider', 'prompt'])   // Only select needed columns
            ->groupBy('ai_provider');

        if ($promptsByProvider->isEmpty()) {
            return [];
        }

        $maxPrompts  = 25;
        $totalPrompts = $promptsByProvider->sum(fn ($p) => $p->count());

        if ($totalPrompts <= $maxPrompts) {
            return $promptsByProvider->flatten()->pluck('prompt')->toArray();
        }

        return $this->distributeProportionally($promptsByProvider, $totalPrompts, $maxPrompts);
    }

    /**
     * Proportionally distribute prompts across providers using Largest Remainder Method.
     */
    protected function distributeProportionally(Collection $promptsByProvider, int $total, int $max): array
    {
        $allocations    = [];
        $fractionalParts = [];

        foreach ($promptsByProvider as $provider => $prompts) {
            $exact                   = ($prompts->count() / $total) * $max;
            $allocations[$provider]  = (int) floor($exact);
            $fractionalParts[$provider] = $exact - floor($exact);
        }

        // Distribute remainder slots to providers with highest fractional part
        $remainder = $max - array_sum($allocations);
        arsort($fractionalParts);

        $count = 0;
        foreach ($fractionalParts as $provider => $_) {
            if ($count >= $remainder) {
                break;
            }
            $allocations[$provider]++;
            $count++;
        }

        $selected = [];
        foreach ($promptsByProvider as $provider => $prompts) {
            $take = $allocations[$provider] ?? 0;
            if ($take > 0) {
                foreach ($prompts->take($take) as $prompt) {
                    $selected[] = $prompt->prompt;
                }
            }
        }

        return $selected;
    }

    /**
     * Debug info about prompt selection breakdown.
     */
    protected function getPromptSelectionInfo(Post $post): array
    {
        $promptsByProvider = $post->prompts()
            ->where('is_selected', true)
            ->where('status', 'active')
            ->get(['ai_provider', 'prompt'])
            ->groupBy('ai_provider');

        $totalPrompts = $promptsByProvider->sum(fn ($p) => $p->count());
        $maxPrompts   = 25;
        $selectionInfo = [];

        foreach ($promptsByProvider as $provider => $prompts) {
            $count      = $prompts->count();
            $proportion = $totalPrompts > 0 ? $count / $totalPrompts : 0;
            $selected   = $totalPrompts <= $maxPrompts
                ? $count
                : (int) floor($proportion * $maxPrompts);

            $selectionInfo[$provider] = [
                'total_prompts'  => $count,
                'proportion'     => round($proportion * 100, 2) . '%',
                'selected_count' => $selected,
            ];
        }

        return [
            'total_prompts_available' => $totalPrompts,
            'max_prompts_limit'       => $maxPrompts,
            'providers_breakdown'     => $selectionInfo,
        ];
    }

    // -------------------------------------------------------------------------
    // Core Check Runner
    // -------------------------------------------------------------------------

    /**
     * Run citation checks — one API call per prompt, stored individually.
     */
    protected function runProviderChecks(Post $post, array $prompts, string $provider): array
    {
        $isMentioned      = false;
        $promptsMentioned = 0;
        $allResources     = [];
        $promptResults    = [];

        foreach ($prompts as $promptText) {
            $result = $this->checkCitationWithProvider($post, $promptText, $provider);

            // Store this prompt's result as its own DB row immediately
            $this->storePromptCitationResult($post, $provider, $promptText, $result);

            $promptResults[] = [
                'prompt'       => $promptText,
                'is_mentioned' => $result['is_mentioned'] ?? false,
                'resources'    => $result['resources']    ?? [],
                'confidence'   => $result['confidence']   ?? 0.0,
                'raw_response' => $result['raw_response'] ?? '',
            ];

            if (! empty($result['is_mentioned'])) {
                $isMentioned = true;
                $promptsMentioned++;
            }
            if (! empty($result['resources'])) {
                array_push($allResources, ...$result['resources']);
            }
        }

        return [
            'success'               => true,
            'is_mentioned'          => $isMentioned,
            'prompts_analyzed'      => count($prompts),
            'prompts_mentioning_url' => $promptsMentioned,
            'resources'             => array_values(array_unique($allResources)),
            'prompt_results'        => $promptResults,
        ];
    }

    protected function checkCitationWithProvider(Post $post, string $promptText, string $provider): array
    {
        $builtPrompt = $this->buildCitationCheckPrompt($post->url, $promptText);

        return match ($provider) {
            'openai'     => $this->checkWithOpenAI($builtPrompt),
            'gemini'     => $this->checkWithGemini($builtPrompt),
            'perplexity' => $this->checkWithPerplexity($builtPrompt),
            default      => throw new \InvalidArgumentException("Unsupported provider: {$provider}"),
        };
    }

    protected function buildCitationCheckPrompt(string $url, string $prompt): string
    {
        return <<<PROMPT
        You are a real-time web search assistant. Search the web right now and answer this prompt: "{$prompt}"

        After answering, check if the URL "{$url}" appears in your response or in the sources you referenced.

        Respond ONLY with a valid JSON object — no markdown, no extra text:
        {
          "is_mentioned": <boolean>,
          "position": <integer|null>,
          "citation_text": <string|null>,
          "referrer_url": <string|null>,
          "resources": [<array of all source URLs cited>],
          "confidence": <float 0-1>,
          "source_url": "{$url}",
          "prompts_analyzed": 1,
          "prompts_mentioning_url": <0 or 1>,
          "search_context": <string>
        }
        PROMPT;
    }

    // -------------------------------------------------------------------------
    // Provider API Callers
    // -------------------------------------------------------------------------

    protected function checkWithOpenAI(string $prompt): array
    {
        $aiModel = $this->getProviderConfig('openai');

        $model = $aiModel->api_config['model'] ?? 'gpt-4o-search-preview';

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$aiModel->api_config['api_key']}",
            'Content-Type'  => 'application/json',
        ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model'    => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'You are a citation verification assistant. Respond with JSON only.'],
                ['role' => 'user',   'content' => $prompt],
            ],
            'max_tokens'  => 1000,
            'temperature' => 0.1,
        ]);

        if (! $response->successful()) {
            throw new \Exception('OpenAI API error: ' . $response->body());
        }

        $content = $response->json()['choices'][0]['message']['content'] ?? '';

        return $this->parseAIResponse($content, 'openai');
    }

    protected function checkWithGemini(string $prompt): array
    {
        $aiModel = $this->getProviderConfig('gemini');
        $model   = $aiModel->api_config['model'] ?? 'gemini-2.0-flash';
        $apiKey  = $aiModel->api_config['api_key'];

        $response = Http::timeout(60)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
            [
                'contents'         => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => [
                    'temperature'       => 0.1,
                    'maxOutputTokens'   => 2048,
                    'responseMimeType'  => 'application/json',  // Forces Gemini to return raw JSON (no fences)
                ],
            ]
        );

        if (! $response->successful()) {
            throw new \Exception('Gemini API error: ' . $response->body());
        }

        $content = $response->json()['candidates'][0]['content']['parts'][0]['text'] ?? '';

        return $this->parseAIResponse($content, 'gemini');
    }

    protected function checkWithPerplexity(string $prompt): array
    {
        $aiModel = $this->getProviderConfig('perplexity');
        $model   = $aiModel->api_config['model'] ?? 'sonar-pro';
        $apiKey  = $aiModel->api_config['api_key'];

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
        ])->timeout(60)->post('https://api.perplexity.ai/chat/completions', [
            'model'       => $model,
            'messages'    => [
                ['role' => 'system', 'content' => 'You are a citation verification assistant. Respond with JSON only.'],
                ['role' => 'user',   'content' => $prompt],
            ],
            'max_tokens'  => 1000,
            'temperature' => 0.1,
        ]);

        if (! $response->successful()) {
            throw new \Exception('Perplexity API error: ' . $response->body());
        }

        $content = $response->json()['choices'][0]['message']['content'] ?? '';

        return $this->parseAIResponse($content, 'perplexity');
    }

    // -------------------------------------------------------------------------
    // Response Parsing
    // -------------------------------------------------------------------------

    protected function parseAIResponse(string $content, string $provider): array
    {
        // Strip markdown code fences (e.g. ```json ... ``` possibly multi-line)
        $cleaned = preg_replace('/^```(?:json)?\s*/im', '', trim($content));
        $cleaned = preg_replace('/\s*```\s*$/m', '', $cleaned);
        $cleaned = trim($cleaned);

        // Find the opening brace and try to parse the longest valid JSON object
        $start = strpos($cleaned, '{');
        if ($start !== false) {
            $substring = substr($cleaned, $start);

            // First try direct parse (handles complete JSON)
            $jsonData = json_decode($substring, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                return $this->buildSuccessResponse($jsonData, $content, $provider);
            }

            // For truncated JSON: try finding the last valid closing brace
            $lastBrace = strrpos($substring, '}');
            while ($lastBrace !== false && $lastBrace > 0) {
                $candidate = substr($substring, 0, $lastBrace + 1);
                $jsonData  = json_decode($candidate, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                    Log::warning("Parsed truncated JSON from {$provider} — some fields may be missing");
                    return $this->buildSuccessResponse($jsonData, $content, $provider);
                }
                $lastBrace = strrpos($substring, '}', -(strlen($substring) - $lastBrace) - 1);
            }
        }

        Log::warning("Failed to parse AI response from {$provider}", [
            'raw_content' => substr($content, 0, 500),
        ]);

        return [
            'success'                => false,
            'provider'               => $provider,
            'is_mentioned'           => false,
            'position'               => null,
            'citation_text'          => null,
            'referrer_url'           => null,
            'resources'              => [],
            'confidence'             => 0.0,
            'source_url'             => null,
            'prompts_analyzed'       => 0,
            'prompts_mentioning_url' => 0,
            'search_context'         => 'Failed to parse AI response',
            'raw_response'           => $content,
            'parse_error'            => 'Invalid JSON in AI response',
        ];
    }

    /**
     * Build a standardized success response from parsed JSON data.
     */
    protected function buildSuccessResponse(array $jsonData, string $rawContent, string $provider): array
    {
        return [
            'success'                => true,
            'provider'               => $provider,
            'is_mentioned'           => (bool)  ($jsonData['is_mentioned']           ?? false),
            'position'               =>           $jsonData['position']               ?? null,
            'citation_text'          =>           $jsonData['citation_text']          ?? null,
            'referrer_url'           =>           $jsonData['referrer_url']           ?? null,
            'resources'              => (array)  ($jsonData['resources']              ?? []),
            'confidence'             => (float)  ($jsonData['confidence']             ?? 0.5),
            'source_url'             =>           $jsonData['source_url']             ?? null,
            'prompts_analyzed'       => (int)    ($jsonData['prompts_analyzed']       ?? 0),
            'prompts_mentioning_url' => (int)    ($jsonData['prompts_mentioning_url'] ?? 0),
            'search_context'         =>           $jsonData['search_context']         ?? null,
            'raw_response'           => $rawContent,
        ];
    }

    // -------------------------------------------------------------------------
    // Database Storage
    // -------------------------------------------------------------------------

    /**
     * Store one citation row per individual prompt.
     */
    protected function storePromptCitationResult(
        Post   $post,
        string $provider,
        string $promptText,
        array  $result
    ): void {
        $promptHash = md5($promptText);

        PostCitation::updateOrCreate(
            [
                'post_id'     => $post->id,
                'ai_model'    => $provider,
                'prompt_hash' => $promptHash,
            ],
            [
                'prompt_text'   => $promptText,
                'citation_text' => $result['citation_text'] ?? null,
                'citation_url'  => $result['referrer_url']  ?? null,
                'position'      => $result['position']      ?? null,
                'is_mentioned'  => $result['is_mentioned']  ?? false,
                'metadata'      => [
                    'confidence'             => $result['confidence']            ?? 0.0,
                    'raw_response'           => $result['raw_response']          ?? '',
                    'provider'               => $provider,
                    'success'                => $result['success']               ?? false,
                    'source_url'             => $result['source_url']            ?? $post->url,
                    'referrer_url'           => $result['referrer_url']          ?? null,
                    'resources'              => $result['resources']             ?? [],
                    'search_context'         => $result['search_context']        ?? null,
                ],
                'checked_at' => now(),
            ]
        );
    }
}
