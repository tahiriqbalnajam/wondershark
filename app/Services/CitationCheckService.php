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

    /**
     * Cache of resolved canonical URLs for reddit share links, keyed by the
     * original share-link URL. Avoids re-following the same 301 redirect for
     * every prompt/provider during a single citation check run.
     */
    protected array $canonicalUrlCache = [];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public function runCitationCheck(Post $post): array
    {
        // Only check published posts. Draft/archived/removed posts are skipped
        // regardless of their prompts' status. (Mirrors the daily command's
        // Post::where('status', 'published') gate.)
        if ($post->status !== 'published') {
            return [
                'success' => false,
                'message' => "Post is not published (status={$post->status}); skipping citation check.",
                'results' => [],
            ];
        }

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
        // All selected prompts are checked regardless of prompt status
        // (suggested/active/inactive). The gate is the post's status, not the
        // prompt's — see runCitationCheck() for the published-post guard.
        $promptsByProvider = $post->prompts()
            ->where('is_selected', true)
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
     * Skips prompts that were already checked within the last 7 days.
     */
    protected function runProviderChecks(Post $post, array $prompts, string $provider): array
    {
        $isMentioned      = false;
        $promptsMentioned = 0;
        $allResources     = [];
        $promptResults    = [];
        $skippedCount     = 0;
        $sevenDaysAgo     = now()->subDays(7);

        foreach ($prompts as $promptText) {
            $promptHash = md5($promptText);

            // Skip if this prompt was checked within the last 7 days
            $recentExists = PostCitation::where('post_id', $post->id)
                ->where('ai_model', $provider)
                ->where('prompt_hash', $promptHash)
                ->where('checked_at', '>=', $sevenDaysAgo)
                ->exists();

            if ($recentExists) {
                $skippedCount++;
                continue;
            }

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
            'success'                => true,
            'is_mentioned'           => $isMentioned,
            'prompts_analyzed'       => count($promptResults),
            'prompts_skipped'        => $skippedCount,
            'prompts_mentioning_url' => $promptsMentioned,
            'resources'              => array_values(array_unique($allResources)),
            'prompt_results'         => $promptResults,
        ];
    }

    protected function checkCitationWithProvider(Post $post, string $promptText, string $provider): array
    {
        $builtPrompt = $this->buildCitationCheckPrompt($post->url, $promptText);

        $result = match ($provider) {
            'openai'     => $this->checkWithOpenAI($builtPrompt),
            'gemini'     => $this->checkWithGemini($builtPrompt),
            'perplexity' => $this->checkWithPerplexity($builtPrompt),
            default      => throw new \InvalidArgumentException("Unsupported provider: {$provider}"),
        };

        // The model frequently surfaces the target URL in its `resources`
        // (search results) but still reports is_mentioned=false, because it
        // distinguishes "appeared in results" from "cited in the answer".
        // For our purpose, the post being returned in the search results for
        // this query counts as mentioned — so match the target URL against the
        // returned resources ourselves and override accordingly.
        $targets = $this->targetUrls($post->url);
        if (! empty($result['resources']) && ! empty($targets)) {
            foreach ($result['resources'] as $resourceUrl) {
                $matched = $this->urlMatchesTarget((string) $resourceUrl, $targets);
                if ($matched !== null) {
                    $result['matched_url']  = $matched;
                    $result['is_mentioned'] = true;
                    break;
                }
            }
        }

        // If the model reported its own matched_url, honour it.
        if (! empty($result['matched_url'])) {
            $result['is_mentioned'] = true;
        }

        return $result;
    }

    protected function buildCitationCheckPrompt(string $url, string $prompt): string
    {
        // Normalize the target URL so reddit share links (/s/<token>) and deep
        // comment permalinks (/comments/<id>/comment/<id>) are matched against
        // their canonical thread URL, which is the form AI search engines
        // actually surface and cite.
        $canonical = $this->normalizeRedditUrl($url);

        $targets = array_values(array_unique(array_filter(
            [$url, $canonical],
            fn ($u) => $u !== null && $u !== ''
        )));

        $targetList = implode(' or ', array_map(fn ($u) => "\"{$u}\"", $targets));

        return <<<PROMPT
        A user asks you the following question. Answer it the way you normally would for that user — use web search and cite the sources you genuinely reference in your answer. Do not go looking for any specific page; answer naturally.

        Question: "{$prompt}"

        After answering, report whether the page below was among the sources you actually cited in your answer:
        Target URL(s): {$targetList}

        It counts as cited only if you referenced it (or its canonical form — for example a Reddit thread cited by its canonical comments URL rather than a "/s/<token>" share link, or a comment permalink rather than the thread root) as a source. If it did not come up as a source, report not mentioned.

        Respond ONLY with a valid JSON object — no markdown, no extra text:
        {
          "is_mentioned": <boolean — true only if the target URL/canonical was one of your cited sources>,
          "position": <integer|null>,
          "citation_text": <string|null>,
          "referrer_url": <string|null>,
          "resources": [<array of the source URLs you actually cited in your answer>],
          "confidence": <float 0-1>,
          "source_url": "{$url}",
          "matched_url": <the target URL that was cited, or null>,
          "prompts_analyzed": 1,
          "prompts_mentioning_url": <0 or 1>,
          "search_context": <string>
        }
        PROMPT;
    }

    /**
     * Normalize a post URL to the form AI search engines actually cite.
     *
     * For Reddit URLs this resolves share links (/s/<token>) to their
     * canonical thread URL (via the 301 redirect) and strips deep
     * comment-permalink segments + query strings down to the thread root:
     *   https://www.reddit.com/r/<sub>/comments/<threadId>/
     *
     * Non-Reddit URLs are returned with their query string/fragment removed.
     */
    protected function normalizeRedditUrl(string $url): string
    {
        // Deep comment permalink: /r/<sub>/comments/<threadId>/comment/<commentId>
        if (preg_match('~reddit\.com/r/([^/]+)/comments/([^/?#]+)~i', $url, $m)) {
            return 'https://www.reddit.com/r/' . $m[1] . '/comments/' . $m[2] . '/';
        }

        // Share link: /r/<sub>/s/<token> — resolve via 301 redirect.
        if (preg_match('~reddit\.com/r/([^/]+)/s/([^/?#]+)~i', $url)) {
            return $this->resolveShareLink($url) ?? $this->stripQueryAndFragment($url);
        }

        return $this->stripQueryAndFragment($url);
    }

    /**
     * Follow the 301 redirect of a Reddit share link to its canonical thread URL.
     * Returns the normalized canonical URL, or null if resolution fails.
     */
    protected function resolveShareLink(string $url): ?string
    {
        if (array_key_exists($url, $this->canonicalUrlCache)) {
            return $this->canonicalUrlCache[$url];
        }

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; CitationBot/1.0)',
            ])
                ->withoutRedirecting()
                ->timeout(15)
                ->get($url);

            if ($response->status() >= 300 && $response->status() < 400) {
                $location = $response->header('Location');
                $location = is_array($location) ? ($location[0] ?? null) : $location;

                if ($location) {
                    // The redirect target may itself be a comments URL with a
                    // slug + share query params; normalize it to the thread root.
                    $canonical = $this->normalizeRedditUrl($location);
                    $this->canonicalUrlCache[$url] = $canonical;

                    return $canonical;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to resolve reddit share link', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
        }

        $this->canonicalUrlCache[$url] = null;

        return null;
    }

    protected function stripQueryAndFragment(string $url): string
    {
        return preg_replace('~[?#].*$~', '', $url);
    }

    /**
     * The set of URLs to match a post against: the raw post URL plus its
     * normalized/canonical form (e.g. a Reddit share link resolved to its
     * canonical thread URL).
     */
    protected function targetUrls(string $url): array
    {
        $canonical = $this->normalizeRedditUrl($url);

        return array_values(array_unique(array_filter(
            [$url, $canonical],
            fn ($u) => $u !== null && $u !== ''
        )));
    }

    /**
     * A stable comparison key for a URL. Reddit URLs are reduced to their
     * thread identity (r/<sub>/comments/<threadId>); everything else is
     * compared by lowercased host + path (query/fragment stripped).
     */
    protected function urlMatchKey(string $url): ?string
    {
        if (preg_match('~reddit\.com/r/([^/]+)/comments/([^/?#]+)~i', $url, $m)) {
            return 'reddit:' . strtolower($m[1]) . ':' . $m[2];
        }

        $stripped = $this->stripQueryAndFragment($url);
        $host = parse_url($stripped, PHP_URL_HOST);
        $path = parse_url($stripped, PHP_URL_PATH);

        if ($host === null) {
            return null;
        }

        return strtolower($host) . ($path ?: '/');
    }

    /**
     * Return the target URL that a given resource URL matches, or null.
     */
    protected function urlMatchesTarget(string $resourceUrl, array $targets): ?string
    {
        $resKey = $this->urlMatchKey($resourceUrl);
        if ($resKey === null) {
            return null;
        }

        foreach ($targets as $target) {
            if ($this->urlMatchKey($target) === $resKey) {
                return $target;
            }
        }

        return null;
    }

    /**
     * JSON Schema used to force OpenAI Structured Outputs for the citation
     * response. Strict mode requires every property to be declared and listed
     * in `required`; nullable fields use a [type, "null"] union.
     */
    protected function citationResponseSchema(): array
    {
        return [
            'type'                 => 'object',
            'additionalProperties' => false,
            'properties'           => [
                'is_mentioned'           => ['type' => 'boolean'],
                'position'               => ['type' => ['integer', 'null']],
                'citation_text'          => ['type' => ['string', 'null']],
                'referrer_url'           => ['type' => ['string', 'null']],
                'resources'              => ['type' => 'array', 'items' => ['type' => 'string']],
                'confidence'             => ['type' => 'number'],
                'matched_url'            => ['type' => ['string', 'null']],
                'prompts_analyzed'       => ['type' => 'integer'],
                'prompts_mentioning_url' => ['type' => 'integer'],
                'search_context'         => ['type' => 'string'],
            ],
            'required' => [
                'is_mentioned', 'position', 'citation_text', 'referrer_url',
                'resources', 'confidence', 'matched_url', 'prompts_analyzed',
                'prompts_mentioning_url', 'search_context',
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Provider API Callers
    // -------------------------------------------------------------------------

    protected function checkWithOpenAI(string $prompt): array
    {
        $aiModel = $this->getProviderConfig('openai');

        // Use the Responses API with the built-in `web_search` tool so the
        // model actually browses the web (plain chat models like gpt-4o cannot
        // search and always return empty resources). The deprecated
        // gpt-4o-search-preview chat-completions models were shut down
        // 2026-07-23; the modern path is Responses + web_search.
        //
        // Uses the dedicated `search_model` config (a reasoning model such as
        // gpt-5.5) so the general chat `model` (used by the rest of the app and
        // the admin "test AI model" button) can stay a plain chat model.
        $model = $aiModel->api_config['search_model'] ?? $aiModel->api_config['model'] ?? 'gpt-5.5';

        // Force the exact JSON schema via Structured Outputs so the model
        // can't drift into its own field names. 2000 output tokens is plenty
        // for the structured citation result on a non-reasoning chat model
        // (e.g. gpt-5.6-luna) — the old 8000 budget only existed because the
        // gpt-5.5 reasoning model wasted ~1700 tokens on reasoning before it
        // would even invoke web_search. Keep an eye on results; bump back up
        // if you see truncated JSON.
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$aiModel->api_config['api_key']}",
            'Content-Type'  => 'application/json',
        ])->timeout(120)->post('https://api.openai.com/v1/responses', [
            'model'             => $model,
            'tools'             => [['type' => 'web_search', 'search_context_size' => 'medium']],
            'instructions'      => 'You are a citation verification assistant. Answer the user\'s question as you normally would using web search, and list only the sources you actually cite in your answer in the resources field. Do not hunt for any particular page. Respond with the JSON schema only.',
            'input'             => $prompt,
            'max_output_tokens' => 2000,
            'text'              => [
                'format' => [
                    'type'   => 'json_schema',
                    'name'   => 'citation_result',
                    'strict' => true,
                    'schema' => $this->citationResponseSchema(),
                ],
            ],
        ]);

        if (! $response->successful()) {
            throw new \Exception('OpenAI API error: ' . $response->body());
        }

        $json = $response->json();

        // The final answer lives in the `message` output item's content. The
        // top-level `output_text` can be empty when reasoning is interleaved,
        // so read the message item directly.
        $content = '';
        $annotationUrls = [];
        foreach ($json['output'] ?? [] as $item) {
            if (($item['type'] ?? '') !== 'message') {
                continue;
            }
            foreach ($item['content'] ?? [] as $c) {
                if (($c['type'] ?? '') === 'output_text' && ! empty($c['text'])) {
                    $content = $c['text'];
                }
                foreach ($c['annotations'] ?? [] as $a) {
                    if (($a['type'] ?? '') === 'url_citation' && ! empty($a['url_citation']['url'])) {
                        $annotationUrls[] = $a['url_citation']['url'];
                    }
                }
            }
        }
        if ($content === '') {
            $content = $json['output_text'] ?? '';
        }

        $parsed = $this->parseAIResponse($content, 'openai');

        // Merge any URL-citation annotations the model attached, in case it did
        // not list them inside the JSON `resources` field.
        if (! empty($annotationUrls)) {
            $parsed['resources'] = array_values(array_unique(array_merge(
                $parsed['resources'] ?? [],
                $annotationUrls
            )));
        }

        return $parsed;
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
            'matched_url'            =>           $jsonData['matched_url']             ?? null,
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
                    'matched_url'            => $result['matched_url']           ?? null,
                    'referrer_url'           => $result['referrer_url']          ?? null,
                    'resources'              => $result['resources']             ?? [],
                    'search_context'         => $result['search_context']        ?? null,
                ],
                'checked_at' => now(),
            ]
        );
    }
}
