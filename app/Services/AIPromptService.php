<?php

namespace App\Services;

use App\Models\GeneratedPrompt;
use App\Models\AiModel;
use Prism\Prism\Prism;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AIPromptService
{
    public function generatePromptsForWebsite(string $website, string $sessionId, string $provider = 'openai', string $description = '', int $promptCount = null): array
    {
        $aiModel = $this->getAiModelConfig($provider);
        
        if (!$aiModel) {
            Log::warning('AI Model not found or disabled', ['provider' => $provider]);
            // Return empty array instead of fallback prompts
            return [];
        }

        $prompt = $this->buildPrompt($website, $description, $promptCount ?? $aiModel->prompts_per_brand);
        
        try {
            $response = $this->callAiProvider($aiModel, $prompt);
            $content = $response->text;
            $questions = $this->parseQuestions($content);
            
            // Store generated prompts in database
            $generatedPrompts = [];
            foreach ($questions as $index => $question) {
                $generatedPrompt = GeneratedPrompt::create([
                    'session_id' => $sessionId,
                    'website' => $website,
                    'prompt' => trim($question),
                    'source' => 'ai_generated',
                    'ai_provider' => $provider,
                    'order' => $index + 1,
                    'is_selected' => true,
                ]);
                
                $generatedPrompts[] = $generatedPrompt;
            }
            
            return $generatedPrompts;
            
        } catch (\Exception $e) {
            Log::error('AI Prompt Generation Failed', [
                'website' => $website,
                'provider' => $provider,
                'model' => $aiModel->display_name,
                'error' => $e->getMessage()
            ]);
            
            // Return empty array instead of fallback prompts when AI generation fails
            return [];
        }
    }

    /**
     * Get AI model configuration from database
     */
    protected function getAiModelConfig(string $provider): ?AiModel
    {
        return AiModel::where('name', $provider)
            ->where('is_enabled', true)
            ->first();
    }

    /**
     * Call AI provider using configured settings from database
     */
    protected function callAiProvider(AiModel $aiModel, string $prompt)
    {
        $config = $aiModel->api_config;
        
        if (empty($config['api_key'])) {
            throw new \Exception("API key not configured for {$aiModel->display_name}");
        }

        $apiKey = trim($config['api_key']);
        $model = $config['model'] ?? $this->getDefaultModel($aiModel->name);
        $temperature = $config['temperature'] ?? 0.7;
        $maxTokens = $config['max_tokens'] ?? 2000;

        // Use direct HTTP calls to ensure we use database configuration, not .env
        switch ($aiModel->name) {
            case 'openai':
                return $this->callOpenAIDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'gemini':
            case 'google':
                return $this->callGeminiDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'anthropic':
            case 'claude':
                return $this->callAnthropicDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'groq':
                return $this->callGroqDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'perplexity':
                return $this->callPerplexityDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'mistral':
                return $this->callMistralDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'deepseek':
                return $this->callDeepSeekDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'xai':
            case 'x-ai':
            case 'grok':
                return $this->callXAIDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'openrouter':
                return $this->callOpenRouterDirect($apiKey, $model, $prompt, $temperature, $maxTokens);

            case 'ollama':
                return $this->callOllamaDirect($apiKey, $model, $prompt, $temperature, $maxTokens, $config);

            default:
                // Generic fallback - try OpenAI-compatible API
                return $this->callOpenAIDirect($apiKey, $model, $prompt, $temperature, $maxTokens);
        }
    }

    protected function buildPrompt(string $website, string $description = '', int $promptCount = 25): string
    {
        $contextInfo = $description ? "\n\nKEY FOCUS AREAS / TARGET KEYWORDS: {$description}\n\nIMPORTANT: Generate statements that naturally incorporate these keywords and focus areas while remaining generic and avoiding brand names." : '';
        
        return "Given a website {$website} and a desired number of statements {$promptCount}, analyze the website's content to identify key themes, products, benefits, problems solved, and target user needs. Then, generate {$promptCount} unique, generic statements (a mix of questions and declarative phrases) that reflect natural user intents, as if potential customers are seeking solutions where the website's offerings would be highly relevant.{$contextInfo}

                Ensure each statement:

                1. Does NOT include {$website} or any brand name in the text, making the statements fully generic.
                2. Focuses on user problems, remedies, or comparisons in the website's domain, drawing from its content without assuming or referencing specific industries.
                3. Varies in intent (e.g., seeking relief methods, natural alternatives, product comparisons, or seasonal solutions).
                4. Is concise, actionable, and under 20 words, relevant to what users might search for based on the website's described benefits and testimonials.
                5. Remains generic and does not use website-specific keywords; base phrasing on inferred user needs from content analysis.
                6. Reflects real search behaviors, like how-to guides, remedy suggestions, or best options for common issues addressed by the site.
                7. When keywords/focus areas are provided, naturally incorporate them into the statements while maintaining a generic, user-intent focused approach.

                Requirements:
                - Return ONLY the statements, one per line
                - No numbering, bullets, or other formatting
                - No explanations or additional text
                - Output should be spreadsheet compatible (each statement on a new line)
                - Statements should be completely generic and not reference any specific brand names, URLs, or hardcoded terms

                Generate exactly {$promptCount} statements:";
    }

    protected function parseQuestions(string $content): array
    {
        // Split by newlines and filter out empty lines
        $lines = array_filter(array_map('trim', explode("\n", $content)));
        
        // Remove any numbering or bullets
        $questions = array_map(function($line) {
            return preg_replace('/^\d+\.?\s*/', '', $line);
        }, $lines);
        
        // Ensure we have questions (contain question marks or start with question words)
        $questions = array_filter($questions, function($line) {
            return !empty($line) && (
                str_contains($line, '?') || 
                preg_match('/^(what|how|why|when|where|which|who|can|is|are|do|does|will|would|should)/i', $line)
            );
        });
        
        // Return all valid questions (don't limit to 25 since different models may generate different amounts)
        return array_values($questions);
    }

    protected function getFallbackPrompts(string $website, string $sessionId): array
    {
        $fallbackQuestions = [
            "What are the key features of this platform?",
            "How can this service help with business needs?",
            "What makes this solution different from competitors?",
            "Is this platform suitable for small businesses?",
            "What are the pricing options available?",
            "What are the main benefits of using this service?",
            "How do I get started with this platform?",
            "What customer support options are available?",
            "Can this service integrate with other tools?",
            "What are users saying about this platform?",
        ];
        
        $generatedPrompts = [];
        foreach ($fallbackQuestions as $index => $question) {
            $generatedPrompt = GeneratedPrompt::create([
                'session_id' => $sessionId,
                'website' => $website,
                'prompt' => $question,
                'source' => 'fallback',
                'ai_provider' => 'fallback',
                'order' => $index + 1,
                'is_selected' => true,
            ]);
            
            $generatedPrompts[] = $generatedPrompt;
        }
        
        return $generatedPrompts;
    }

    public function getPromptsForWebsite(string $website): \Illuminate\Database\Eloquent\Collection
    {
        return GeneratedPrompt::forWebsite($website)
            ->where('source', '!=', 'fallback')
            ->orderBy('order')
            ->get();
    }

    /**
     * Get available AI providers from database
     */
    public function getAvailableProviders(): array
    {
        return AiModel::enabled()
            ->ordered()
            ->get()
            ->mapWithKeys(function ($model) {
                return [$model->name => $model->display_name];
            })
            ->toArray();
    }

    /**
     * Get all enabled AI models with their configuration
     */
    public function getEnabledAiModels(): \Illuminate\Database\Eloquent\Collection
    {
        return AiModel::enabled()->ordered()->get();
    }

    /**
     * Generate prompts from multiple AI models automatically
     */
    public function generatePromptsFromMultipleModels(string $website, string $sessionId, string $description = ''): array
    {
        $aiModels = $this->getEnabledAiModels();
        $allGeneratedPrompts = [];
        $successfulModels = [];
        $failedModels = [];
        
        if ($aiModels->isEmpty()) {
            Log::warning('No enabled AI models found for prompt generation');
            return [];
        }
        
        foreach ($aiModels as $aiModel) {
            try {
                // Check if model has required configuration
                $config = $aiModel->api_config;
                if (empty($config['api_key'])) {
                    Log::warning("Skipping {$aiModel->display_name} - no API key configured");
                    $failedModels[] = [
                        'model' => $aiModel->display_name,
                        'error' => 'API key not configured'
                    ];
                    continue;
                }
                
                // Always generate 25 prompts from each model
                $prompts = $this->generatePromptsForWebsite($website, $sessionId, $aiModel->name, $description, 25);
                
                if (!empty($prompts)) {
                    $allGeneratedPrompts = array_merge($allGeneratedPrompts, $prompts);
                    $successfulModels[] = $aiModel->display_name;
                    
                    Log::info("Successfully generated prompts from {$aiModel->display_name}", [
                        'count' => count($prompts),
                        'website' => $website
                    ]);
                } else {
                    $failedModels[] = [
                        'model' => $aiModel->display_name,
                        'error' => 'No prompts generated'
                    ];
                }
                
            } catch (\Exception $e) {
                Log::warning("Failed to generate prompts from {$aiModel->display_name}", [
                    'error' => $e->getMessage(),
                    'website' => $website,
                    'model' => $aiModel->name
                ]);
                
                $failedModels[] = [
                    'model' => $aiModel->display_name,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        // Log summary
        Log::info('AI prompt generation summary', [
            'website' => $website,
            'total_prompts' => count($allGeneratedPrompts),
            'successful_models' => $successfulModels,
            'failed_models' => array_column($failedModels, 'model'),
            'total_models_attempted' => count($aiModels)
        ]);
        
        // Remove duplicates and similar prompts
        $uniquePrompts = $this->removeDuplicatePrompts($allGeneratedPrompts);
        
        return $uniquePrompts;
    }

    /**
     * Get prompts with ratio-based selection for frontend display
     */
    public function getPromptsWithRatio(string $website, int $limit = 25, int $offset = 0): array
    {
        // Get active AI model names
        $activeAiModels = $this->getEnabledAiModels()->pluck('name')->toArray();
        
        if (empty($activeAiModels)) {
            return [];
        }

        // Only get prompts from active AI models (exclude fallback prompts completely)
        $allPrompts = GeneratedPrompt::forWebsite($website)
            ->where('source', 'ai_generated') // Only AI generated prompts
            ->where('ai_provider', '!=', 'fallback') // Explicitly exclude fallback
            ->whereIn('ai_provider', $activeAiModels)
            ->orderBy('order')
            ->get()
            ->toArray();

        if (empty($allPrompts)) {
            return [];
        }

        // Remove duplicates and similar prompts
        $uniquePrompts = $this->removeDuplicatePrompts($allPrompts);

        return $this->selectPromptsWithRatio($uniquePrompts, $limit, $offset);
    }

    /**
     * Get total count of available prompts for a website from active AI models
     */
    public function getTotalPromptsCount(string $website): int
    {
        // Get active AI model names
        $activeAiModels = $this->getEnabledAiModels()->pluck('name')->toArray();
        
        if (empty($activeAiModels)) {
            return 0;
        }

        // Remove duplicates and similar prompts to get accurate count (exclude fallback prompts completely)
        $allPrompts = GeneratedPrompt::forWebsite($website)
            ->where('source', 'ai_generated') // Only AI generated prompts
            ->where('ai_provider', '!=', 'fallback') // Explicitly exclude fallback
            ->whereIn('ai_provider', $activeAiModels)
            ->orderBy('order')
            ->get();

        if ($allPrompts->isEmpty()) {
            return 0;
        }

        $uniquePrompts = $this->removeDuplicatePrompts($allPrompts->toArray());
        return count($uniquePrompts);
    }

    /**
     * Remove duplicate and similar prompts
     */
    protected function removeDuplicatePrompts(array $prompts): array
    {
        $uniquePrompts = [];
        $seenPrompts = [];
        $seenWords = [];

        foreach ($prompts as $prompt) {
            $promptText = strtolower(trim($prompt->prompt));
            $words = array_unique(str_word_count($promptText, 1));
            
            // Check for exact duplicates
            if (in_array($promptText, $seenPrompts)) {
                continue;
            }

            // Check for similar prompts (sharing 80% of words)
            $isSimilar = false;
            foreach ($seenWords as $existingWords) {
                $intersection = array_intersect($words, $existingWords);
                $similarity = count($intersection) / max(count($words), count($existingWords));
                
                if ($similarity >= 0.8) {
                    $isSimilar = true;
                    break;
                }
            }

            if (!$isSimilar) {
                $uniquePrompts[] = $prompt;
                $seenPrompts[] = $promptText;
                $seenWords[] = $words;
            }
        }

        return $uniquePrompts;
    }

    /**
     * Select prompts using ratio-based distribution
     */
    protected function selectPromptsWithRatio(array $prompts, int $limit, int $offset = 0): array
    {
        // Group prompts by AI provider
        $groupedPrompts = [];
        foreach ($prompts as $prompt) {
            $provider = $prompt['ai_provider'] ?? 'unknown';
            $groupedPrompts[$provider][] = $prompt;
        }

        $providers = array_keys($groupedPrompts);
        $providerCount = count($providers);
        
        if ($providerCount === 0) {
            return [];
        }

        // Calculate how many prompts we need to get (including offset)
        $totalNeeded = $offset + $limit;
        $selectedPrompts = [];
        
        // Create a balanced selection across all providers
        $maxRounds = ceil($totalNeeded / $providerCount);
        
        for ($round = 0; $round < $maxRounds && count($selectedPrompts) < $totalNeeded; $round++) {
            foreach ($providers as $provider) {
                if (isset($groupedPrompts[$provider][$round])) {
                    $selectedPrompts[] = $groupedPrompts[$provider][$round];
                    if (count($selectedPrompts) >= $totalNeeded) {
                        break;
                    }
                }
            }
        }

        // Apply offset and limit
        return array_slice($selectedPrompts, $offset, $limit);
    }

    public function getPromptsForSession(string $sessionId): array
    {
        return GeneratedPrompt::forSession($sessionId)
            ->orderBy('order')
            ->get()
            ->toArray();
    }

    public function updatePromptSelection(int $promptId, bool $isSelected): bool
    {
        $prompt = GeneratedPrompt::find($promptId);
        if ($prompt) {
            $prompt->update(['is_selected' => $isSelected]);
            return true;
        }
        return false;
    }

    public function addCustomPrompt(string $sessionId, string $promptText, string $website = null): GeneratedPrompt
    {
        $maxOrder = GeneratedPrompt::forSession($sessionId)->max('order') ?? 0;
        
        return GeneratedPrompt::create([
            'session_id' => $sessionId,
            'website' => $website,
            'prompt' => $promptText,
            'source' => 'user_added',
            'ai_provider' => null,
            'order' => $maxOrder + 1,
            'is_selected' => true,
        ]);
    }

    /**
     * Test AI model connection and configuration
     */
    public function testAiModelConnection(AiModel $aiModel): array
    {
        try {
            // Validate API configuration first
            $config = $aiModel->api_config;
            
            if (empty($config['api_key'])) {
                return [
                    'success' => false,
                    'message' => "API key not configured for {$aiModel->display_name}. Please configure the API key in the AI Model settings.",
                    'model' => $aiModel->display_name,
                    'error_type' => 'configuration'
                ];
            }
            
            if (empty($config['model'])) {
                return [
                    'success' => false,
                    'message' => "Model name not configured for {$aiModel->display_name}. Please configure the model name in the AI Model settings.",
                    'model' => $aiModel->display_name,
                    'error_type' => 'configuration'
                ];
            }
            
            $testPrompt = "Generate a simple test response to verify the API connection. Just respond with 'Connection successful'.";
            
            $response = $this->callAiProvider($aiModel, $testPrompt);
            
            return [
                'success' => true,
                'message' => 'Connection successful',
                'response' => $response->text,
                'model_used' => $aiModel->api_config['model'] ?? 'Unknown'
            ];
        } catch (\Exception $e) {
            // Log the error for debugging
            Log::error('AI Model Test Failed', [
                'model_id' => $aiModel->id,
                'model_name' => $aiModel->name,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'model' => $aiModel->display_name,
                'error_type' => 'api_error'
            ];
        }
    }

    /**
     * Get default model name for each provider
     */
    protected function getDefaultModel(string $provider): string
    {
        return match($provider) {
            'openai' => 'gpt-3.5-turbo',
            'gemini', 'google' => 'gemini-pro',
            'anthropic', 'claude' => 'claude-3-haiku-20240307',
            'groq' => 'llama-3.1-70b-versatile',
            'perplexity' => 'llama-3.1-sonar-small-128k-online',
            'mistral' => 'mistral-small-latest',
            'deepseek' => 'deepseek-chat',
            'xai', 'x-ai', 'grok' => 'grok-beta',
            'openrouter' => 'meta-llama/llama-3.1-8b-instruct:free',
            'ollama' => 'llama3.1',
            default => 'gpt-3.5-turbo'
        };
    }

    /**
     * Call OpenAI API directly
     */
    protected function callOpenAIDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        // Validate API key format for OpenAI (should start with 'sk-')
        if (!str_starts_with($apiKey, 'sk-')) {
            throw new \Exception("Invalid OpenAI API key format. OpenAI API keys should start with 'sk-'");
        }

        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            $errorBody = $response->body();
            $errorData = json_decode($errorBody, true);
            $errorMessage = $errorData['error']['message'] ?? $errorBody;
            
            throw new \Exception("OpenAI API error (Status: {$response->status()}): {$errorMessage}");
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call Gemini API directly
     */
    protected function callGeminiDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::timeout(60)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]]
                ],
                'generationConfig' => [
                    'temperature' => $temperature,
                    'maxOutputTokens' => $maxTokens,
                ]
            ]);

        if (!$response->successful()) {
            throw new \Exception("Gemini API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['candidates'][0]['content']['parts'][0]['text'] ?? ''];
    }

    /**
     * Call Anthropic API directly
     */
    protected function callAnthropicDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])
            ->timeout(60)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $maxTokens,
                'temperature' => $temperature,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ]
            ]);

        if (!$response->successful()) {
            throw new \Exception("Anthropic API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['content'][0]['text'] ?? ''];
    }

    /**
     * Call Groq API directly
     */
    protected function callGroqDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("Groq API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call Perplexity API directly
     */
    protected function callPerplexityDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.perplexity.ai/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("Perplexity API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call Mistral API directly
     */
    protected function callMistralDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.mistral.ai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("Mistral API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call DeepSeek API directly
     */
    protected function callDeepSeekDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.deepseek.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("DeepSeek API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call XAI API directly
     */
    protected function callXAIDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.x.ai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("XAI API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call OpenRouter API directly
     */
    protected function callOpenRouterDirect($apiKey, $model, $prompt, $temperature, $maxTokens)
    {
        $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://openrouter.ai/api/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);

        if (!$response->successful()) {
            throw new \Exception("OpenRouter API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['choices'][0]['message']['content'] ?? ''];
    }

    /**
     * Call Ollama API directly
     */
    protected function callOllamaDirect($apiKey, $model, $prompt, $temperature, $maxTokens, $config)
    {
        $baseUrl = $config['base_url'] ?? 'http://localhost:11434';
        
        $response = \Illuminate\Support\Facades\Http::timeout(60)
            ->post("{$baseUrl}/api/generate", [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => $temperature,
                    'num_predict' => $maxTokens,
                ]
            ]);

        if (!$response->successful()) {
            throw new \Exception("Ollama API error: " . $response->status() . " - " . $response->body());
        }

        $data = $response->json();
        return (object) ['text' => $data['response'] ?? ''];
    }
}
