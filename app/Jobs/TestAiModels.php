<?php

namespace App\Jobs;

use App\Mail\AiModelFailureNotification;
use App\Models\AiModel;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TestAiModels implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('Starting AI models health check');

        $failedModels = [];
        $aiModels = AiModel::where('is_enabled', true)->get();

        foreach ($aiModels as $aiModel) {
            Log::info("Testing AI model: {$aiModel->display_name}");

            try {
                $isWorking = $this->testAiModel($aiModel);

                if (! $isWorking) {
                    // Disable the model
                    $aiModel->update(['is_enabled' => false]);
                    $failedModels[] = $aiModel;

                    Log::warning("AI model {$aiModel->display_name} failed health check and has been disabled");
                }
            } catch (\Exception $e) {
                // Disable the model on exception
                $aiModel->update(['is_enabled' => false]);
                $failedModels[] = $aiModel;

                Log::error("AI model {$aiModel->display_name} test threw exception", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        // Send email notification if any models failed
        if (! empty($failedModels)) {
            $this->notifyAdmins($failedModels);
        }

        Log::info('AI models health check completed', [
            'total_tested' => $aiModels->count(),
            'failed' => count($failedModels),
        ]);
    }

    /**
     * Test an AI model with a simple prompt
     */
    protected function testAiModel(AiModel $aiModel): bool
    {
        $config = $aiModel->api_config;

        if (empty($config['api_key'])) {
            Log::warning("AI model {$aiModel->display_name} has no API key configured");

            return false;
        }

        $apiKey = trim($config['api_key']);
        $model = $config['model'] ?? $this->getDefaultModel($aiModel->name);
        $testPrompt = 'Hello. Respond with "OK" if you can process this message.';

        try {
            $response = match ($aiModel->name) {
                'openai' => $this->testOpenAI($apiKey, $model, $testPrompt),
                'gemini', 'google' => $this->testGemini($apiKey, $model, $testPrompt),
                'anthropic', 'claude' => $this->testAnthropic($apiKey, $model, $testPrompt),
                'groq' => $this->testGroq($apiKey, $model, $testPrompt),
                'perplexity' => $this->testPerplexity($apiKey, $model, $testPrompt),
                'mistral' => $this->testMistral($apiKey, $model, $testPrompt),
                'deepseek' => $this->testDeepSeek($apiKey, $model, $testPrompt),
                'xai', 'x-ai', 'grok' => $this->testXAI($apiKey, $model, $testPrompt),
                'openrouter' => $this->testOpenRouter($apiKey, $model, $testPrompt),
                'ollama' => $this->testOllama($apiKey, $model, $testPrompt, $config),
                default => $this->testOpenAI($apiKey, $model, $testPrompt), // Generic fallback
            };

            return $response !== null;
        } catch (\Exception $e) {
            Log::error("Failed to test {$aiModel->display_name}", [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    protected function testOpenAI(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testGemini(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(30)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
            ]);

        if ($response->successful()) {
            return $response->json('candidates.0.content.parts.0.text');
        }

        return null;
    }

    protected function testAnthropic(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('content.0.text');
        }

        return null;
    }

    protected function testGroq(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testPerplexity(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.perplexity.ai/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testMistral(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.mistral.ai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testDeepSeek(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.deepseek.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testXAI(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://api.x.ai/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testOpenRouter(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://openrouter.ai/api/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 50,
            ]);

        if ($response->successful()) {
            return $response->json('choices.0.message.content');
        }

        return null;
    }

    protected function testOllama(string $apiKey, string $model, string $prompt, array $config): ?string
    {
        $baseUrl = $config['base_url'] ?? 'http://localhost:11434';

        $response = Http::timeout(30)
            ->post("{$baseUrl}/api/generate", [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
            ]);

        if ($response->successful()) {
            return $response->json('response');
        }

        return null;
    }

    /**
     * Get default model for a provider
     */
    protected function getDefaultModel(string $provider): string
    {
        return match ($provider) {
            'openai' => 'gpt-4o-mini',
            'anthropic', 'claude' => 'claude-3-5-sonnet-20241022',
            'gemini', 'google' => 'gemini-1.5-flash',
            'groq' => 'llama-3.3-70b-versatile',
            'perplexity' => 'llama-3.1-sonar-small-128k-online',
            'mistral' => 'mistral-small-latest',
            'deepseek' => 'deepseek-chat',
            'xai', 'x-ai', 'grok' => 'grok-beta',
            'openrouter' => 'openai/gpt-4o-mini',
            'ollama' => 'llama2',
            default => 'gpt-4o-mini',
        };
    }

    /**
     * Notify admin users about failed models
     */
    protected function notifyAdmins(array $failedModels): void
    {
        $admins = User::role('admin')->get();

        if ($admins->isEmpty()) {
            Log::warning('No admin users found to notify about AI model failures');

            return;
        }

        foreach ($admins as $admin) {
            try {
                Mail::to($admin->email)->send(new AiModelFailureNotification($failedModels));
                Log::info("Sent AI model failure notification to {$admin->email}");
            } catch (\Exception $e) {
                Log::error("Failed to send email to {$admin->email}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
