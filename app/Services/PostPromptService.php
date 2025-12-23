<?php

namespace App\Services;

use App\Models\PostPrompt;
use App\Models\Post;
use App\Models\AiModel;
use Prism\Prism\Prism;
use Illuminate\Support\Facades\Log;

class PostPromptService extends AIPromptService
{
    /**
     * Generate prompts for a specific post
     */
    public function generatePromptsForPost(Post $post, string $sessionId, string $provider = 'openai', string $description = '', int $promptCount = null): array
    {
        $aiModel = $this->getAiModelConfig($provider);
        
        if (!$aiModel) {
            Log::warning('AI Model not found or disabled', ['provider' => $provider]);
            return []; // Don't create fallback prompts
        }

        $prompt = $this->buildPostPrompt($post, $description, $promptCount ?? $aiModel->prompts_per_brand);
        
        try {
            $response = $this->callAiProvider($aiModel, $prompt);
            $content = $response->text;
            $questions = $this->parseQuestions($content);
            
            // Store generated prompts in database with brand_id
            $generatedPrompts = [];
            foreach ($questions as $index => $question) {
                // Get country code, ensure it's 2 characters max
                $countryCode = $post->brand->country_code ?? null;
                if ($countryCode && strlen($countryCode) > 2) {
                    $countryCode = substr($countryCode, 0, 2);
                }
                
                $generatedPrompt = PostPrompt::create([
                    'brand_id' => $post->brand_id, // Add brand_id for unified table
                    'post_id' => $post->id,
                    'session_id' => $sessionId,
                    'prompt' => trim($question),
                    'source' => 'ai_generated',
                    'ai_provider' => $provider,
                    'ai_model_id' => $aiModel->id, // Add AI model reference
                    'order' => $index + 1,
                    'is_selected' => true,
                    'is_active' => true,
                    'country_code' => $countryCode, // Use truncated country_code
                    'position' => 0,
                    'sentiment' => 0,
                    'visibility' => 0,
                    'volume' => 'low',
                    'location' => $post->brand->country_code ?? null,
                    'status' => 'suggested',
                ]);
                
                // Analyze and save stats immediately using AI
                try {
                    $stats = $this->analyzePromptStatsWithAI($generatedPrompt, $post, $provider);
                    $generatedPrompt->update([
                        'visibility' => $stats['visibility'],
                        'position' => $stats['position'],
                        'sentiment' => $stats['sentiment'],
                        'volume' => $stats['volume'],
                    ]);
                    
                    Log::info('Prompt stats analyzed and saved', [
                        'prompt_id' => $generatedPrompt->id,
                        'prompt' => $generatedPrompt->prompt,
                        'stats' => $stats
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to analyze prompt stats during generation', [
                        'prompt_id' => $generatedPrompt->id,
                        'error' => $e->getMessage()
                    ]);
                }
                
                $generatedPrompts[] = $generatedPrompt;
            }
            
            return $generatedPrompts;
            
        } catch (\Exception $e) {
            Log::error('AI Prompt Generation Failed for Post', [
                'post_id' => $post->id,
                'post_url' => $post->url,
                'provider' => $provider,
                'model' => $aiModel->display_name,
                'error' => $e->getMessage()
            ]);
            
            // Don't return fallback prompts, just return empty array
            return [];
        }
    }

    /**
     * Generate prompts from multiple AI models for a post
     */
    public function generatePromptsFromMultipleModelsForPost(Post $post, string $sessionId, string $description = ''): array
    {
        $aiModels = $this->getEnabledAiModels();
        $allGeneratedPrompts = [];
        
        foreach ($aiModels as $aiModel) {
            try {
                // Generate based on AI model configuration
                $promptCount = $this->getPromptCountForModel($aiModel);
                $prompts = $this->generatePromptsForPost($post, $sessionId, $aiModel->name, $description, $promptCount);
                $allGeneratedPrompts = array_merge($allGeneratedPrompts, $prompts);
            } catch (\Exception $e) {
                Log::warning("Failed to generate prompts from {$aiModel->display_name} for post", [
                    'error' => $e->getMessage(),
                    'post_id' => $post->id,
                    'post_url' => $post->url,
                    'model' => $aiModel->name
                ]);
            }
        }
        
        // Remove duplicates and similar prompts
        $uniquePrompts = $this->removeDuplicatePostPrompts($allGeneratedPrompts);
        
        // Limit to maximum 5 prompts
        $limitedPrompts = array_slice($uniquePrompts, 0, 5);
        
        // Delete any prompts beyond the limit
        if (count($uniquePrompts) > 5) {
            $promptsToDelete = array_slice($uniquePrompts, 5);
            foreach ($promptsToDelete as $prompt) {
                if (isset($prompt->id)) {
                    PostPrompt::where('id', $prompt->id)->delete();
                }
            }
        }
        
        // Note: Stats (visibility, sentiment, position, volume) will remain null initially
        // They will be populated later when:
        // 1. The post gets citations in AI responses
        // 2. A background job analyzes the prompts
        // 3. Manual analysis is triggered
        
        return $limitedPrompts;
    }

    /**
     * Update prompt stats based on AI chat mentions
     * - visibility: Percentage of chats mentioning the brand in the last 30 days
     * - sentiment: Average sentiment score when mentioned in the last 30 days
     * - position: Average position when mentioned in the last 30 days
     * - volume: Search volume category
     */
    protected function updatePromptStats(array $prompts, Post $post): void
    {
        foreach ($prompts as $prompt) {
            try {
                // Calculate stats from AI citations in the last 30 days
                $stats = $this->calculatePromptStatsFromCitations($prompt, $post);
                
                // Update the prompt with calculated stats
                $prompt->update([
                    'visibility' => $stats['visibility'],
                    'sentiment' => $stats['sentiment'],
                    'position' => $stats['position'],
                    'volume' => $stats['volume'],
                    'location' => $post->brand->country_code ?? 'US',
                ]);
                
                Log::info("Updated prompt stats from citations", [
                    'prompt_id' => $prompt->id,
                    'visibility' => $stats['visibility'],
                    'sentiment' => $stats['sentiment'],
                    'position' => $stats['position'],
                    'volume' => $stats['volume']
                ]);
            } catch (\Exception $e) {
                Log::warning("Failed to calculate stats for prompt", [
                    'prompt_id' => $prompt->id,
                    'error' => $e->getMessage()
                ]);
                
                // Set default values if calculation fails
                $prompt->update([
                    'visibility' => null,
                    'sentiment' => 0,
                    'position' => 0,
                    'volume' => 'medium',
                    'location' => $post->brand->country_code ?? 'US',
                ]);
            }
        }
    }

    /**
     * Calculate prompt statistics from AI citations
     * Returns visibility (%), sentiment (avg score), position (avg), and volume
     */
    protected function calculatePromptStatsFromCitations($prompt, Post $post): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        
        // Get all citations for this post in the last 30 days
        $citations = \App\Models\PostCitation::where('post_id', $post->id)
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->get();
        
        $totalChats = $citations->count();
        $mentionedChats = $citations->where('is_mentioned', true)->count();
        
        // Calculate visibility: percentage of chats mentioning the brand
        $visibility = $totalChats > 0 ? round(($mentionedChats / $totalChats) * 100, 2) : null;
        
        // Calculate average sentiment score
        $sentimentScores = $citations->where('is_mentioned', true)
            ->pluck('sentiment_score')
            ->filter(fn($score) => $score !== null);
        $sentiment = $sentimentScores->isNotEmpty() ? round($sentimentScores->avg(), 2) : 0;
        
        // Calculate average position
        $positions = $citations->where('is_mentioned', true)
            ->pluck('position')
            ->filter(fn($pos) => $pos !== null && $pos > 0);
        $position = $positions->isNotEmpty() ? round($positions->avg(), 0) : 0;
        
        // Determine volume based on citation frequency
        $volume = $this->calculateVolumeFromCitations($mentionedChats);
        
        return [
            'visibility' => $visibility,
            'sentiment' => $sentiment,
            'position' => $position,
            'volume' => $volume,
        ];
    }

    /**
     * Calculate volume category based on citation frequency
     */
    protected function calculateVolumeFromCitations(int $mentionCount): string
    {
        if ($mentionCount >= 20) {
            return 'high';
        } elseif ($mentionCount >= 5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Test all enabled AI models for connection and functionality
     */
    public function testAllAiModelConnections(): array
    {
        $results = [];
        $aiModels = $this->getEnabledAiModels();
        
        foreach ($aiModels as $aiModel) {
            $results[$aiModel->name] = $this->testAiModelConnection($aiModel);
        }
        
        return $results;
    }

    /**
     * Test a specific AI model for post prompt generation
     */
    public function testPostPromptGeneration(string $provider = 'openai'): array
    {
        $aiModel = $this->getAiModelConfig($provider);
        
        if (!$aiModel) {
            return [
                'success' => false,
                'message' => 'AI Model not found or disabled',
                'provider' => $provider
            ];
        }

        try {
            $testPrompt = "Generate 3 sample questions that someone might ask about a website that provides online courses. Return only the questions, one per line, no formatting.";
            
            $response = $this->callAiProvider($aiModel, $testPrompt);
            $questions = $this->parseQuestions($response->text);
            
            return [
                'success' => true,
                'provider' => $provider,
                'model' => $aiModel->display_name,
                'questions_generated' => count($questions),
                'sample_questions' => array_slice($questions, 0, 3),
                'raw_response' => $response->text
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'provider' => $provider,
                'model' => $aiModel->display_name,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get prompt count based on AI model configuration
     */
    protected function getPromptCountForModel(AiModel $aiModel): int
    {
        // Check if this is one of the main AI models (OpenAI, Gemini, Perplexity)
        $mainAiModels = ['openai', 'gemini', 'perplexity'];
        
        if (in_array(strtolower($aiModel->name), $mainAiModels)) {
            return 25;
        }
        
        return 5; // For other AI models
    }

    /**
     * Build prompt specifically for post citation checking
     */
    protected function buildPostPrompt(Post $post, string $description = '', int $promptCount = 25): string
    {
        $postContext = $description ? "\n\nAdditional context about this post: {$description}" : '';
        
        return "Analyze the post URL {$post->url} and the post title '{$post->title}' and generate {$promptCount} questions that people would search for where this specific post/article would be a valuable and relevant source or reference.{$postContext}

                Requirements:
                - Focus on questions where {$post->url} would be cited as a source or reference
                - Make questions specific to the content, topic, or information this post provides
                - Questions should be natural search queries that would lead to this post being mentioned
                - Consider the expertise, insights, or unique information this post offers
                - Think about what people would search for that would require this post as supporting evidence
                - Questions should be the type that would appear in citation checks or source verification
                - Return ONLY the questions, one per line
                - No numbering, bullets, or other formatting
                - No explanations or additional text
                - Output should be spreadsheet compatible (each question on a new line)

                Generate exactly {$promptCount} citation-worthy questions:";
    }

    /**
     * Get fallback prompts for a post
     */
    protected function getFallbackPromptsForPost(Post $post, string $sessionId): array
    {
        $fallbackQuestions = [
            "What information is provided in {$post->url}?",
            "What are the main points discussed in {$post->title}?",
            "How does {$post->url} address the topic?",
            "What insights can be found in {$post->title}?",
            "What evidence does {$post->url} provide?",
            "How reliable is the information in {$post->title}?",
            "What sources does {$post->url} reference?",
            "What conclusions are drawn in {$post->title}?",
            "How current is the information in {$post->url}?",
            "What methodology is used in {$post->title}?",
        ];
        
        $generatedPrompts = [];
        foreach ($fallbackQuestions as $index => $question) {
            // Get country code, ensure it's 2 characters max
            $countryCode = $post->brand->country_code ?? null;
            if ($countryCode && strlen($countryCode) > 2) {
                $countryCode = substr($countryCode, 0, 2);
            }
            
            $generatedPrompt = PostPrompt::create([
                'brand_id' => $post->brand_id, // Add brand_id for unified table
                'post_id' => $post->id,
                'session_id' => $sessionId,
                'prompt' => $question,
                'source' => 'fallback',
                'ai_provider' => 'fallback',
                'order' => $index + 1,
                'is_selected' => true,
                'is_active' => true,
                'country_code' => $countryCode, // Use truncated country_code
                'position' => 0,
                'sentiment' => 0,
                'visibility' => 0,
                'volume' => 'low',
                'location' => $post->brand->country_code ?? null,
                'status' => 'active',
            ]);
            
            $generatedPrompts[] = $generatedPrompt;
        }
        
        return $generatedPrompts;
    }

    /**
     * Get prompts with ratio-based selection for a post
     */
    public function getPromptsWithRatioForPost(Post $post, int $limit = 25, int $offset = 0): array
    {
        // Get active AI model names
        $activeAiModels = $this->getEnabledAiModels()->pluck('name')->toArray();
        
        if (empty($activeAiModels)) {
            return [];
        }

        // Only get prompts from active AI models
        $allPrompts = PostPrompt::forPost($post->id)
            ->where('source', '!=', 'fallback')
            ->whereIn('ai_provider', $activeAiModels)
            ->orderBy('order')
            ->get()
            ->toArray();

        if (empty($allPrompts)) {
            return [];
        }

        // Remove duplicates and similar prompts
        $uniquePrompts = $this->removeDuplicatePostPrompts($allPrompts);

        return $this->selectPromptsWithRatio($uniquePrompts, $limit, $offset);
    }

    /**
     * Get total count of available prompts for a post from active AI models
     */
    public function getTotalPromptsCountForPost(Post $post): int
    {
        // Get active AI model names
        $activeAiModels = $this->getEnabledAiModels()->pluck('name')->toArray();
        
        if (empty($activeAiModels)) {
            return 0;
        }

        $allPrompts = PostPrompt::forPost($post->id)
            ->where('source', '!=', 'fallback')
            ->whereIn('ai_provider', $activeAiModels)
            ->orderBy('order')
            ->get();

        if ($allPrompts->isEmpty()) {
            return 0;
        }

        $uniquePrompts = $this->removeDuplicatePostPrompts($allPrompts->toArray());
        return count($uniquePrompts);
    }

    /**
     * Remove duplicate and similar prompts for posts
     */
    protected function removeDuplicatePostPrompts(array $prompts): array
    {
        $uniquePrompts = [];
        $seenPrompts = [];
        $seenWords = [];

        foreach ($prompts as $prompt) {
            $promptText = strtolower(trim($prompt->prompt ?? $prompt['prompt']));
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
     * Get all prompts for a post
     */
    public function getPromptsForPost(Post $post): \Illuminate\Database\Eloquent\Collection
    {
        return PostPrompt::forPost($post->id)
            ->where('source', '!=', 'fallback')
            ->orderBy('order')
            ->get();
    }

    /**
     * Add custom prompt for a post
     */
    public function addCustomPromptForPost(Post $post, string $sessionId, string $promptText): PostPrompt
    {
        $maxOrder = PostPrompt::forPost($post->id)->max('order') ?? 0;
        
        return PostPrompt::create([
            'brand_id' => $post->brand_id, // Add brand_id for unified table
            'post_id' => $post->id,
            'session_id' => $sessionId,
            'prompt' => $promptText,
            'source' => 'user_added',
            'ai_provider' => null,
            'order' => $maxOrder + 1,
            'is_selected' => true,
            'is_active' => true,
            'country_code' => $post->brand->country ?? null, // Add country from brand
            'position' => 0,
            'sentiment' => 'neutral',
            'visibility' => 'public',
            'status' => 'active',
        ]);
    }

    /**
     * Update prompt selection for a post prompt
     */
    public function updatePostPromptSelection(int $promptId, bool $isSelected): bool
    {
        $prompt = PostPrompt::find($promptId);
        if ($prompt) {
            $prompt->update(['is_selected' => $isSelected]);
            return true;
        }
        return false;
    }

    /**
     * Analyze prompt stats using AI without checking citations
     * Stats include:
     * - visibility: How likely the post would be referenced when this prompt is asked to an AI
     * - position: Expected URL position when prompt is asked to an AI (1-10, lower is better)
     * - sentiment: Post URL sentiment/relevance against the prompt (positive/neutral/negative or 1-10 score)
     * - volume: Estimated search volume for this prompt (low/medium/high)
     */
    public function analyzePromptStatsWithAI(PostPrompt $prompt, Post $post, string $provider = 'openai'): array
    {
        $aiModel = $this->getAiModelConfig($provider);
        
        if (!$aiModel) {
            Log::warning('AI Model not found or disabled for prompt analysis', ['provider' => $provider]);
            return $this->getDefaultStats();
        }

        $analysisPrompt = $this->buildPromptStatsAnalysisPrompt($prompt, $post);
        
        try {
            $response = $this->callAiProvider($aiModel, $analysisPrompt);
            $stats = $this->parsePromptStats($response->text);
            
            Log::info('AI Prompt Stats Analysis Completed', [
                'prompt_id' => $prompt->id,
                'post_url' => $post->url,
                'stats' => $stats
            ]);
            
            return $stats;
            
        } catch (\Exception $e) {
            Log::error('AI Prompt Stats Analysis Failed', [
                'prompt_id' => $prompt->id,
                'post_url' => $post->url,
                'provider' => $provider,
                'error' => $e->getMessage()
            ]);
            
            return $this->getDefaultStats();
        }
    }

    /**
     * Build AI prompt for analyzing prompt stats
     */
    protected function buildPromptStatsAnalysisPrompt(PostPrompt $prompt, Post $post): string
    {
        return "You are an SEO and AI visibility analyst. Analyze the following prompt/question and post URL to provide accurate statistics.

Prompt/Question: \"{$prompt->prompt}\"
Post URL: {$post->url}
Post Title: {$post->title}

Analyze and provide the following metrics:

1. VISIBILITY (0-100): How likely is this post URL to be referenced/mentioned when someone asks this exact prompt to an AI assistant like ChatGPT, Claude, or Perplexity? 
   - 0 = Will never be referenced
   - 25 = Unlikely to be referenced
   - 50 = Might be referenced
   - 75 = Likely to be referenced
   - 100 = Very likely to be referenced

2. POSITION (1-10): If the post URL is referenced when this prompt is asked to an AI, what would be its expected position in the response?
   - 1 = First/primary source mentioned
   - 2-3 = Top supporting sources
   - 4-6 = Secondary sources
   - 7-10 = Tertiary or lesser sources

3. SENTIMENT (1-10): How relevant and positively the post URL addresses this specific prompt?
   - 1-3 = Not relevant or negative
   - 4-6 = Somewhat relevant or neutral
   - 7-8 = Relevant and positive
   - 9-10 = Highly relevant and authoritative

4. VOLUME: Estimated search volume for this type of prompt
   - low = Niche or specific query (< 1000 searches/month)
   - medium = Moderate interest (1000-10000 searches/month)
   - high = Popular query (> 10000 searches/month)

Respond ONLY with this exact JSON format (no additional text):
{
    \"visibility\": <number 0-100>,
    \"position\": <number 1-10>,
    \"sentiment\": <number 1-10>,
    \"volume\": \"<low|medium|high>\"
}";
    }

    /**
     * Parse AI response to extract prompt stats
     */
    protected function parsePromptStats(string $response): array
    {
        try {
            // Try to extract JSON from response
            if (preg_match('/\{[^}]+\}/', $response, $matches)) {
                $jsonStr = $matches[0];
                $data = json_decode($jsonStr, true);
                
                if (json_last_error() === JSON_ERROR_NONE && isset($data['visibility'])) {
                    return [
                        'visibility' => (int) ($data['visibility'] ?? 0),
                        'position' => (int) ($data['position'] ?? 5),
                        'sentiment' => (int) ($data['sentiment'] ?? 5),
                        'volume' => $data['volume'] ?? 'medium',
                    ];
                }
            }
            
            // Fallback: try to extract values from text
            $visibility = 0;
            $position = 5;
            $sentiment = 5;
            $volume = 'medium';
            
            if (preg_match('/visibility["\s:]+(\d+)/i', $response, $matches)) {
                $visibility = (int) $matches[1];
            }
            if (preg_match('/position["\s:]+(\d+)/i', $response, $matches)) {
                $position = (int) $matches[1];
            }
            if (preg_match('/sentiment["\s:]+(\d+)/i', $response, $matches)) {
                $sentiment = (int) $matches[1];
            }
            if (preg_match('/volume["\s:]+"?(low|medium|high)/i', $response, $matches)) {
                $volume = strtolower($matches[1]);
            }
            
            return [
                'visibility' => $visibility,
                'position' => $position,
                'sentiment' => $sentiment,
                'volume' => $volume,
            ];
            
        } catch (\Exception $e) {
            Log::error('Failed to parse prompt stats', [
                'response' => $response,
                'error' => $e->getMessage()
            ]);
            
            return $this->getDefaultStats();
        }
    }

    /**
     * Get default stats when analysis fails
     */
    protected function getDefaultStats(): array
    {
        return [
            'visibility' => 0,
            'position' => 0,
            'sentiment' => 0,
            'volume' => 'low',
        ];
    }

    /**
     * Analyze and update stats for a single prompt
     */
    public function updatePromptStatsWithAI(PostPrompt $prompt, Post $post, string $provider = 'openai'): bool
    {
        try {
            $stats = $this->analyzePromptStatsWithAI($prompt, $post, $provider);
            
            $prompt->update([
                'visibility' => $stats['visibility'],
                'position' => $stats['position'],
                'sentiment' => $stats['sentiment'],
                'volume' => $stats['volume'],
            ]);
            
            Log::info('Updated prompt stats with AI analysis', [
                'prompt_id' => $prompt->id,
                'stats' => $stats
            ]);
            
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to update prompt stats with AI', [
                'prompt_id' => $prompt->id,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Batch analyze prompts for a post using AI
     */
    public function batchAnalyzePromptsForPost(Post $post, string $provider = 'openai', ?int $limit = null): array
    {
        $query = PostPrompt::forPost($post->id)
            ->where('is_active', true);
        
        if ($limit) {
            $query->limit($limit);
        }
        
        $prompts = $query->get();
        $results = [];
        
        foreach ($prompts as $prompt) {
            $success = $this->updatePromptStatsWithAI($prompt, $post, $provider);
            $results[] = [
                'prompt_id' => $prompt->id,
                'prompt' => $prompt->prompt,
                'success' => $success,
                'stats' => $success ? [
                    'visibility' => $prompt->visibility,
                    'position' => $prompt->position,
                    'sentiment' => $prompt->sentiment,
                    'volume' => $prompt->volume,
                ] : null,
            ];
        }
        
        return $results;
    }
}
