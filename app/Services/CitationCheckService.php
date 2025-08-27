<?php

namespace App\Services;

use App\Models\Post;
use App\Models\PostCitation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class CitationCheckService
{
    protected array $aiProviders = [
        'openai' => 'OpenAI',
        'gemini' => 'Gemini',
        'perplexity' => 'Perplexity'
    ];

    public function runCitationCheck(Post $post): array
    {
        $results = [];
        $combinedPrompts = $this->getCombinedPrompts($post);
        $promptSelectionInfo = $this->getPromptSelectionInfo($post);
        
        if (empty($combinedPrompts)) {
            return [
                'success' => false,
                'message' => 'No prompts found for the brand associated with this post',
                'results' => [],
                'prompt_selection_info' => $promptSelectionInfo
            ];
        }

        foreach ($this->aiProviders as $provider => $displayName) {
            try {
                $result = $this->checkCitationWithProvider($post, $combinedPrompts, $provider);
                $results[$provider] = $result;
                
                // Store the result in database
                $this->storeCitationResult($post, $provider, $result);
                
            } catch (\Exception $e) {
                Log::error("Citation check failed for {$provider}", [
                    'post_id' => $post->id,
                    'error' => $e->getMessage()
                ]);
                
                $results[$provider] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                    'is_mentioned' => false,
                    'position' => null
                ];
            }
        }

        return [
            'success' => true,
            'post_id' => $post->id,
            'post_url' => $post->url,
            'combined_prompts' => $combinedPrompts,
            'prompt_selection_info' => $promptSelectionInfo,
            'results' => $results
        ];
    }

    protected function getCombinedPrompts(Post $post): string
    {
        // Get all selected prompts grouped by AI provider
        $promptsByProvider = $post->prompts()
            ->where('is_selected', true)
            ->get()
            ->groupBy('ai_provider');

        if ($promptsByProvider->isEmpty()) {
            return '';
        }

        $selectedPrompts = [];
        $totalPrompts = $promptsByProvider->sum(fn($prompts) => $prompts->count());
        $maxPrompts = 25;

        // If total prompts is less than or equal to 25, take all
        if ($totalPrompts <= $maxPrompts) {
            foreach ($promptsByProvider as $provider => $prompts) {
                foreach ($prompts as $prompt) {
                    $selectedPrompts[] = $prompt->prompt;
                }
            }
        } else {
            // Calculate proportional distribution
            $selectedPerProvider = [];
            
            foreach ($promptsByProvider as $provider => $prompts) {
                $providerCount = $prompts->count();
                $proportion = $providerCount / $totalPrompts;
                $allocatedCount = floor($proportion * $maxPrompts);
                $selectedPerProvider[$provider] = $allocatedCount;
            }
            
            // Handle remainder to reach exactly 25 prompts
            $totalAllocated = array_sum($selectedPerProvider);
            $remainder = $maxPrompts - $totalAllocated;
            
            // Distribute remainder to providers with the highest fractional part
            if ($remainder > 0) {
                $fractionalParts = [];
                foreach ($promptsByProvider as $provider => $prompts) {
                    $providerCount = $prompts->count();
                    $proportion = $providerCount / $totalPrompts;
                    $exactAllocation = $proportion * $maxPrompts;
                    $fractionalParts[$provider] = $exactAllocation - floor($exactAllocation);
                }
                
                // Sort by fractional part (descending) to give remainder to those who "deserve" it most
                arsort($fractionalParts);
                
                $remainderCount = 0;
                foreach ($fractionalParts as $provider => $fractional) {
                    if ($remainderCount >= $remainder) break;
                    $selectedPerProvider[$provider]++;
                    $remainderCount++;
                }
            }
            
            // Select prompts from each provider
            foreach ($promptsByProvider as $provider => $prompts) {
                $countToTake = $selectedPerProvider[$provider];
                if ($countToTake > 0) {
                    $selectedPromptsFromProvider = $prompts->take($countToTake);
                    foreach ($selectedPromptsFromProvider as $prompt) {
                        $selectedPrompts[] = $prompt->prompt;
                    }
                }
            }
        }

        return implode(', ', $selectedPrompts);
    }

    /**
     * Get detailed information about prompt selection for debugging
     */
    protected function getPromptSelectionInfo(Post $post): array
    {
        // Get all selected prompts grouped by AI provider
        $promptsByProvider = $post->prompts()
            ->where('is_selected', true)
            ->get()
            ->groupBy('ai_provider');

        $totalPrompts = $promptsByProvider->sum(fn($prompts) => $prompts->count());
        $maxPrompts = 25;
        $selectionInfo = [];

        if ($totalPrompts <= $maxPrompts) {
            // Take all prompts if within limit
            foreach ($promptsByProvider as $provider => $prompts) {
                $selectionInfo[$provider] = [
                    'total_prompts' => $prompts->count(),
                    'proportion' => round(($prompts->count() / $totalPrompts) * 100, 2) . '%',
                    'selected_count' => $prompts->count(),
                ];
            }
        } else {
            // Calculate proportional distribution
            $selectedPerProvider = [];
            
            foreach ($promptsByProvider as $provider => $prompts) {
                $providerCount = $prompts->count();
                $proportion = $providerCount / $totalPrompts;
                $allocatedCount = floor($proportion * $maxPrompts);
                $selectedPerProvider[$provider] = $allocatedCount;
            }
            
            // Handle remainder distribution
            $totalAllocated = array_sum($selectedPerProvider);
            $remainder = $maxPrompts - $totalAllocated;
            
            if ($remainder > 0) {
                $fractionalParts = [];
                foreach ($promptsByProvider as $provider => $prompts) {
                    $providerCount = $prompts->count();
                    $proportion = $providerCount / $totalPrompts;
                    $exactAllocation = $proportion * $maxPrompts;
                    $fractionalParts[$provider] = $exactAllocation - floor($exactAllocation);
                }
                
                arsort($fractionalParts);
                
                $remainderCount = 0;
                foreach ($fractionalParts as $provider => $fractional) {
                    if ($remainderCount >= $remainder) break;
                    $selectedPerProvider[$provider]++;
                    $remainderCount++;
                }
            }
            
            foreach ($promptsByProvider as $provider => $prompts) {
                $providerCount = $prompts->count();
                $proportion = $providerCount / $totalPrompts;
                
                $selectionInfo[$provider] = [
                    'total_prompts' => $providerCount,
                    'proportion' => round($proportion * 100, 2) . '%',
                    'selected_count' => $selectedPerProvider[$provider],
                ];
            }
        }

        return [
            'total_prompts_available' => $totalPrompts,
            'max_prompts_limit' => $maxPrompts,
            'providers_breakdown' => $selectionInfo,
        ];
    }

    protected function checkCitationWithProvider(Post $post, string $combinedPrompts, string $provider): array
    {
        $prompt = $this->buildCitationCheckPrompt($post->url, $combinedPrompts);
        
        switch ($provider) {
            case 'openai':
                return $this->checkWithOpenAI($prompt);
            case 'gemini':
                return $this->checkWithGemini($prompt);
            case 'perplexity':
                return $this->checkWithPerplexity($prompt);
            default:
                throw new \InvalidArgumentException("Unsupported provider: {$provider}");
        }
    }

    protected function buildCitationCheckPrompt(string $url, string $prompts): string
    {
        return "Please check if the URL '{$url}' is cited or mentioned as a source in response to these prompts: {$prompts}. 
        
        Note: These prompts have been selected from a larger set using proportional distribution across AI models (maximum 25 prompts).
        
        Please respond with a JSON object containing:
        - 'is_mentioned': boolean (true if the URL is mentioned/cited)
        - 'position': integer or null (the position/rank of the citation, 1 being first, null if not mentioned)
        - 'citation_text': string or null (the exact text where the URL is mentioned)
        - 'confidence': float (confidence level between 0 and 1)
        - 'source_url': string (the URL being checked: '{$url}')
        - 'prompts_analyzed': integer (total number of prompts/questions analyzed)
        - 'prompts_mentioning_url': integer (number of prompts where this URL was found as a source)
        - 'search_context': string (brief description of how/where the URL was found or not found)
        
        Only respond with the JSON object, no additional text.";
    }

    protected function checkWithOpenAI(string $prompt): array
    {
        $apiKey = config('services.openai.api_key');
        
        if (!$apiKey) {
            throw new \Exception('OpenAI API key not configured');
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a citation verification assistant. Provide accurate JSON responses only.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'max_tokens' => 500,
            'temperature' => 0.3
        ]);

        if (!$response->successful()) {
            throw new \Exception("OpenAI API error: " . $response->body());
        }

        $result = $response->json();
        $content = $result['choices'][0]['message']['content'] ?? '';
        
        return $this->parseAIResponse($content, 'openai');
    }

    protected function checkWithGemini(string $prompt): array
    {
        $apiKey = config('services.gemini.api_key');
        
        if (!$apiKey) {
            throw new \Exception('Gemini API key not configured');
        }

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        [
                            'text' => $prompt
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.3,
                'maxOutputTokens' => 500,
            ]
        ]);

        if (!$response->successful()) {
            throw new \Exception("Gemini API error: " . $response->body());
        }

        $result = $response->json();
        $content = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';
        
        return $this->parseAIResponse($content, 'gemini');
    }

    protected function checkWithPerplexity(string $prompt): array
    {
        $apiKey = config('services.perplexity.api_key');
        
        if (!$apiKey) {
            throw new \Exception('Perplexity API key not configured');
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.perplexity.ai/chat/completions', [
            'model' => 'llama-3.1-sonar-small-128k-online',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a citation verification assistant. Provide accurate JSON responses only.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'max_tokens' => 500,
            'temperature' => 0.3
        ]);

        if (!$response->successful()) {
            throw new \Exception("Perplexity API error: " . $response->body());
        }

        $result = $response->json();
        $content = $result['choices'][0]['message']['content'] ?? '';
        
        return $this->parseAIResponse($content, 'perplexity');
    }

    protected function parseAIResponse(string $content, string $provider): array
    {
        // Try to extract JSON from the response
        $jsonMatch = [];
        if (preg_match('/\{.*\}/s', $content, $jsonMatch)) {
            $jsonData = json_decode($jsonMatch[0], true);
            
            if (json_last_error() === JSON_ERROR_NONE) {
                return [
                    'success' => true,
                    'provider' => $provider,
                    'is_mentioned' => $jsonData['is_mentioned'] ?? false,
                    'position' => $jsonData['position'] ?? null,
                    'citation_text' => $jsonData['citation_text'] ?? null,
                    'confidence' => $jsonData['confidence'] ?? 0.5,
                    'source_url' => $jsonData['source_url'] ?? null,
                    'prompts_analyzed' => $jsonData['prompts_analyzed'] ?? 0,
                    'prompts_mentioning_url' => $jsonData['prompts_mentioning_url'] ?? 0,
                    'search_context' => $jsonData['search_context'] ?? null,
                    'raw_response' => $content
                ];
            }
        }

        // Fallback if JSON parsing fails
        return [
            'success' => false,
            'provider' => $provider,
            'is_mentioned' => false,
            'position' => null,
            'citation_text' => null,
            'confidence' => 0.0,
            'source_url' => null,
            'prompts_analyzed' => 0,
            'prompts_mentioning_url' => 0,
            'search_context' => 'Failed to parse AI response',
            'raw_response' => $content,
            'parse_error' => 'Failed to parse JSON response'
        ];
    }

    protected function storeCitationResult(Post $post, string $provider, array $result): void
    {
        PostCitation::updateOrCreate(
            [
                'post_id' => $post->id,
                'ai_model' => $provider
            ],
            [
                'citation_text' => $result['citation_text'],
                'citation_url' => $post->url,
                'position' => $result['position'],
                'is_mentioned' => $result['is_mentioned'] ?? false,
                'metadata' => [
                    'confidence' => $result['confidence'] ?? 0.0,
                    'raw_response' => $result['raw_response'] ?? '',
                    'provider' => $provider,
                    'success' => $result['success'] ?? false,
                    'source_url' => $result['source_url'] ?? $post->url,
                    'prompts_analyzed' => $result['prompts_analyzed'] ?? 0,
                    'prompts_mentioning_url' => $result['prompts_mentioning_url'] ?? 0,
                    'search_context' => $result['search_context'] ?? null
                ],
                'checked_at' => now()
            ]
        );
    }

    public function getBatchCitationResults(array $postIds): array
    {
        $results = [];
        
        foreach ($postIds as $postId) {
            $post = Post::find($postId);
            if ($post) {
                $results[] = $this->runCitationCheck($post);
            }
        }

        return $results;
    }
}
