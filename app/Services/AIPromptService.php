<?php

namespace App\Services;

use App\Models\GeneratedPrompt;
use Prism\Prism\Prism;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AIPromptService
{
    protected array $providers = [
        'openai' => 'openai',
        'claude' => 'anthropic',
        'gemini' => 'gemini',
        'groq' => 'groq',
        'deepseek' => 'deepseek',
    ];

    protected array $models = [
        'openai' => 'gpt-4',
        'claude' => 'claude-3-5-sonnet-20241022',
        'gemini' => 'gemini-1.5-pro',
        'groq' => 'llama-3.1-70b-versatile',
        'deepseek' => 'deepseek-chat',
    ];

    public function generatePromptsForWebsite(string $website, string $sessionId, string $provider = 'openai', string $description = ''): array
    {
        $prompt = $this->buildPrompt($website, $description);
        
        try {
            $providerName = $this->providers[$provider] ?? 'openai';
            $model = $this->models[$provider] ?? 'gpt-4';
            
            $response = Prism::text()
                ->using($providerName, $model)
                ->withPrompt($prompt)
                ->generate();

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
                'error' => $e->getMessage()
            ]);
            
            // Return fallback prompts if AI fails
            return $this->getFallbackPrompts($website, $sessionId);
        }
    }

    protected function buildPrompt(string $website, string $description = ''): string
    {
        $contextInfo = $description ? "\n\nAdditional context about {$website}: {$description}" : '';
        
        return "Search Reddit for discussions about {$website} and generate 25 questions that people would most likely ask where a post about this website could be a helpful source on ChatGPT.{$contextInfo}

Requirements:
- Focus on questions where {$website} would be a relevant and helpful answer
- Make questions specific to the industry/niche of this website
- Questions should be conversational and natural
- Return ONLY the questions, one per line
- No numbering, bullets, or other formatting
- No explanations or additional text
- Output should be spreadsheet compatible (each question on a new line)

Generate exactly 25 questions:";
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
        
        // Limit to 25 questions max
        return array_slice(array_values($questions), 0, 25);
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

    public function getAvailableProviders(): array
    {
        return [
            'openai' => 'OpenAI (GPT-4)',
            'claude' => 'Anthropic (Claude)',
            'gemini' => 'Google (Gemini)',
            'groq' => 'Groq (Fast)',
            'deepseek' => 'DeepSeek',
        ];
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
}
