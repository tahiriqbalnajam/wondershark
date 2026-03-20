<?php

namespace App\Services;

use App\Models\AiModel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrandContextService
{
    private const MAX_CONTENT_LENGTH = 4000;

    private const KEY_PAGE_PATTERNS = ['about', 'product', 'service', 'solution', 'feature', 'blog', 'pricing'];

    public function __construct(private AIPromptService $aiService) {}

    /**
     * Extract structured brand context from a website URL using a two-step process:
     * 1. Crawl website pages to collect text content
     * 2. Send content to AI to extract structured brand context JSON
     */
    public function extractContext(string $website, string $provider = 'openai'): array
    {
        $aiModel = AiModel::where('name', $provider)->where('is_enabled', true)->first();

        if (! $aiModel) {
            Log::warning('BrandContextService: AI model not found or disabled', ['provider' => $provider]);

            return [];
        }

        try {
            $pageContents = $this->crawlWebsite($website);

            if (empty($pageContents)) {
                Log::warning('BrandContextService: No page content could be retrieved', ['website' => $website]);

                return [];
            }

            return $this->extractWithAI($pageContents, $website, $aiModel);
        } catch (\Exception $e) {
            Log::warning('BrandContextService: Failed to extract brand context', [
                'website' => $website,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Crawl homepage + up to 3 key pages (About, Products/Services, Blog, etc.)
     * Returns combined text content from all pages.
     */
    private function crawlWebsite(string $website): string
    {
        $baseUrl = rtrim($website, '/');
        $pages = [];

        $homepageHtml = $this->fetchPage($baseUrl);

        if ($homepageHtml) {
            $pages['Homepage'] = substr($this->extractText($homepageHtml), 0, self::MAX_CONTENT_LENGTH);

            $keyLinks = $this->extractKeyPageLinks($homepageHtml, $baseUrl);

            foreach ($keyLinks as $label => $url) {
                $html = $this->fetchPage($url);
                if ($html) {
                    $pages[ucfirst($label)] = substr($this->extractText($html), 0, self::MAX_CONTENT_LENGTH);
                }
                if (count($pages) >= 4) {
                    break;
                }
            }
        }

        if (empty($pages)) {
            return '';
        }

        $combined = '';
        foreach ($pages as $label => $content) {
            $combined .= "\n\n=== {$label} ===\n{$content}";
        }

        return trim($combined);
    }

    /**
     * Fetch a single page, returning HTML or null on failure.
     */
    private function fetchPage(string $url): ?string
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; BrandContextAnalyzer/1.0)'])
                ->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Exception $e) {
            Log::debug('BrandContextService: Failed to fetch page', ['url' => $url, 'error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Strip scripts, styles, and HTML tags to produce clean readable text.
     */
    private function extractText(string $html): string
    {
        $html = preg_replace('/<(script|style|nav|header|footer|noscript)[^>]*>.*?<\/\1>/si', '', $html);
        $text = strip_tags($html);
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Find links to key brand pages (About, Products, Services, Blog, etc.)
     * on the same domain as the base URL.
     */
    private function extractKeyPageLinks(string $html, string $baseUrl): array
    {
        $links = [];
        $baseDomain = parse_url($baseUrl, PHP_URL_HOST);
        $baseParsed = parse_url($baseUrl);

        preg_match_all('/<a[^>]+href=["\']([^"\'#?]+)["\']/i', $html, $matches);

        foreach ($matches[1] as $href) {
            if (preg_match('/^(mailto:|javascript:|tel:)/i', $href)) {
                continue;
            }

            // Resolve relative URLs
            if (str_starts_with($href, '/')) {
                $href = $baseParsed['scheme'].'://'.$baseParsed['host'].$href;
            } elseif (! str_starts_with($href, 'http')) {
                continue;
            }

            // Only follow same-domain links
            if (parse_url($href, PHP_URL_HOST) !== $baseDomain) {
                continue;
            }

            $path = strtolower(parse_url($href, PHP_URL_PATH) ?? '');

            foreach (self::KEY_PAGE_PATTERNS as $pattern) {
                if (str_contains($path, $pattern) && ! isset($links[$pattern])) {
                    $links[$pattern] = $href;
                    break;
                }
            }

            if (count($links) >= 3) {
                break;
            }
        }

        return $links;
    }

    /**
     * Send crawled page content to AI and extract a structured brand context object.
     */
    private function extractWithAI(string $pageContents, string $website, AiModel $aiModel): array
    {
        $prompt = $this->buildExtractionPrompt($website, $pageContents);

        try {
            $responseText = $this->aiService->callAI($aiModel, $prompt);

            return $this->parseContextResponse($responseText);
        } catch (\Exception $e) {
            Log::warning('BrandContextService: AI extraction failed', [
                'website' => $website,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Build the AI prompt that asks for structured brand context JSON.
     */
    private function buildExtractionPrompt(string $website, string $pageContents): string
    {
        return "Analyze the following website content from {$website} and extract structured brand information. Return ONLY a valid JSON object with no additional text, markdown fences, or explanation.

Website content:
{$pageContents}

Extract and return a JSON object with exactly these fields:
{
  \"brand_name\": \"The official brand or company name\",
  \"tagline\": \"The brand's tagline or positioning statement (empty string if not found)\",
  \"products_services\": [\"List of main products or services offered\"],
  \"target_audience\": \"Description of the primary target audience\",
  \"industry\": \"The industry or niche (e.g., SaaS, e-commerce, healthcare, fintech)\",
  \"tone_of_voice\": \"The brand's communication tone (e.g., professional, playful, technical, authoritative)\",
  \"value_propositions\": [\"Key benefits or differentiators the brand offers\"],
  \"keywords\": [\"Frequently used brand-relevant keywords and phrases\"]
}

Rules:
- Return ONLY the JSON object, no other text before or after
- If a field cannot be determined from the content, use an empty string or empty array
- Keep all values concise and specific to this brand";
    }

    /**
     * Parse the AI's JSON response into a structured brand context array.
     */
    private function parseContextResponse(string $response): array
    {
        // Handle markdown code fences
        if (preg_match('/```(?:json)?\s*([\s\S]+?)\s*```/', $response, $matches)) {
            $response = $matches[1];
        }

        // Extract JSON object if wrapped in extra text
        if (preg_match('/\{[\s\S]+\}/s', $response, $matches)) {
            $response = $matches[0];
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($data)) {
            Log::warning('BrandContextService: Failed to parse AI response as JSON', [
                'json_error' => json_last_error_msg(),
            ]);

            return [];
        }

        return [
            'brand_name' => (string) ($data['brand_name'] ?? ''),
            'tagline' => (string) ($data['tagline'] ?? ''),
            'products_services' => (array) ($data['products_services'] ?? []),
            'target_audience' => (string) ($data['target_audience'] ?? ''),
            'industry' => (string) ($data['industry'] ?? ''),
            'tone_of_voice' => (string) ($data['tone_of_voice'] ?? ''),
            'value_propositions' => (array) ($data['value_propositions'] ?? []),
            'keywords' => (array) ($data['keywords'] ?? []),
        ];
    }
}
