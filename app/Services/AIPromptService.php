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
            return $this->getFallbackPrompts($website, $sessionId);
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
            
            // Return fallback prompts if AI fails
            return $this->getFallbackPrompts($website, $sessionId);
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
     * Call AI provider using configured settings
     */
    protected function callAiProvider(AiModel $aiModel, string $prompt)
    {
        $config = $aiModel->api_config;
        
        if (empty($config['api_key'])) {
            throw new \Exception("API key not configured for {$aiModel->display_name}");
        }

        // Map database provider names to Prism provider names
        $providerMapping = [
            'openai' => 'openai',
            'gemini' => 'gemini',
            'anthropic' => 'anthropic',
            'claude' => 'anthropic', // Legacy support
            'perplexity' => 'openai', // Perplexity uses OpenAI-compatible API
            'groq' => 'groq',
            'deepseek' => 'openai', // DeepSeek uses OpenAI-compatible API
        ];

        $prismProvider = $providerMapping[$aiModel->name] ?? 'openai';
        $model = $config['model'] ?? 'gpt-4';

        return Prism::text()
            ->using($prismProvider, $model)
            ->withPrompt($prompt)
            ->generate();
    }

    protected function buildPrompt(string $website, string $description = '', int $promptCount = 25): string
    {
        $contextInfo = $description ? "\n\nAdditional context about {$website}: {$description}" : '';
        
        return "Analyze the website {$website} and generate {$promptCount} questions that potential customers or users would most likely ask where this brand/website would be a valuable and relevant solution.{$contextInfo}

                Requirements:
                - Focus on questions where {$website} would be the perfect answer or solution
                - Make questions specific to the industry, services, or products this website offers
                - Questions should be natural and reflect real user intent
                - Consider problems, needs, or interests that this brand addresses
                - Think about what people would search for that leads them to this website
                - Return ONLY the questions, one per line
                - No numbering, bullets, or other formatting
                - No explanations or additional text
                - Output should be spreadsheet compatible (each question on a new line)

                Generate exactly {$promptCount} questions:";
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
            "What services does {$website} offer?",
            "How can {$website} help with my business needs?",
            "What makes {$website} different from competitors?",
            "Is {$website} suitable for small businesses?",
            "How much does {$website} cost?",
            "What are the benefits of using {$website}?",
            "How do I get started with {$website}?",
            "What customer support does {$website} provide?",
            "Can {$website} integrate with other tools?",
            "What are users saying about {$website}?",
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
        
        foreach ($aiModels as $aiModel) {
            try {
                // Always generate 25 prompts from each model
                $prompts = $this->generatePromptsForWebsite($website, $sessionId, $aiModel->name, $description, 25);
                $allGeneratedPrompts = array_merge($allGeneratedPrompts, $prompts);
            } catch (\Exception $e) {
                Log::warning("Failed to generate prompts from {$aiModel->display_name}", [
                    'error' => $e->getMessage(),
                    'website' => $website,
                    'model' => $aiModel->name
                ]);
            }
        }
        
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

        // Only get prompts from active AI models
        $allPrompts = GeneratedPrompt::forWebsite($website)
            ->where('source', '!=', 'fallback')
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

        // Remove duplicates and similar prompts to get accurate count
        $allPrompts = GeneratedPrompt::forWebsite($website)
            ->where('source', '!=', 'fallback')
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
            $testPrompt = "Generate a simple test response to verify the API connection. Just respond with 'Connection successful'.";
            
            $response = $this->callAiProvider($aiModel, $testPrompt);
            
            return [
                'success' => true,
                'message' => 'Connection successful',
                'response' => $response->text,
                'model_used' => $aiModel->api_config['model'] ?? 'Unknown'
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'model' => $aiModel->display_name
            ];
        }
    }
}
