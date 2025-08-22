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
            return $this->getFallbackPromptsForPost($post, $sessionId);
        }

        $prompt = $this->buildPostPrompt($post, $description, $promptCount ?? $aiModel->prompts_per_brand);
        
        try {
            $response = $this->callAiProvider($aiModel, $prompt);
            $content = $response->text;
            $questions = $this->parseQuestions($content);
            
            // Store generated prompts in database
            $generatedPrompts = [];
            foreach ($questions as $index => $question) {
                $generatedPrompt = PostPrompt::create([
                    'post_id' => $post->id,
                    'session_id' => $sessionId,
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
            Log::error('AI Prompt Generation Failed for Post', [
                'post_id' => $post->id,
                'post_url' => $post->url,
                'provider' => $provider,
                'model' => $aiModel->display_name,
                'error' => $e->getMessage()
            ]);
            
            // Return fallback prompts if AI fails
            return $this->getFallbackPromptsForPost($post, $sessionId);
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
        
        return $uniquePrompts;
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
            $generatedPrompt = PostPrompt::create([
                'post_id' => $post->id,
                'session_id' => $sessionId,
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
            'post_id' => $post->id,
            'session_id' => $sessionId,
            'prompt' => $promptText,
            'source' => 'user_added',
            'ai_provider' => null,
            'order' => $maxOrder + 1,
            'is_selected' => true,
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
}
