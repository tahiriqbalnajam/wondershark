<?php

namespace App\Jobs;

use App\Models\AiApiResponse;
use App\Models\AiModel;
use App\Models\IndustryAnalysis;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessIndustryAnalysis implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $analysis;

    protected $aiModel;

    /**
     * Create a new job instance.
     */
    public function __construct(IndustryAnalysis $analysis, AiModel $aiModel)
    {
        $this->analysis = $analysis;
        $this->aiModel = $aiModel;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("ProcessIndustryAnalysis job started for analysis ID: {$this->analysis->id}");

        try {
            // Update analysis status to processing if this is the first AI provider
            if ($this->analysis->status === 'pending') {
                Log::info('Updating analysis status to processing');
                $this->analysis->update(['status' => 'processing']);
            }

            Log::info("Creating AI response record for provider: {$this->aiModel->name}");

            // Create AI response record
            $aiResponse = AiApiResponse::create([
                'industry_analysis_id' => $this->analysis->id,
                'ai_provider' => $this->aiModel->name,
                'prompt_used' => $this->getPromptForProvider(),
                'status' => 'pending',
            ]);

            $startTime = microtime(true);

            // Make API call based on provider
            $response = $this->callAiProvider($aiResponse->prompt_used);

            $processingTime = microtime(true) - $startTime;

            if ($response['success']) {
                // Parse the response
                $parsedData = $this->parseAiResponse($response['data']);

                // Update AI response record
                $aiResponse->update([
                    'raw_response' => $response['data'],
                    'parsed_data' => $parsedData,
                    'status' => 'completed',
                    'processing_time' => $processingTime,
                    'tokens_used' => $response['tokens_used'] ?? 0,
                    'cost_estimate' => $this->calculateCost($response['tokens_used'] ?? 0),
                ]);
            } else {
                // Update with error
                $aiResponse->update([
                    'status' => 'failed',
                    'error_message' => $response['error'],
                    'processing_time' => $processingTime,
                ]);
            }

            // Check if all AI responses are completed
            $this->checkAnalysisCompletion();

        } catch (\Exception $e) {
            Log::error("AI Analysis Job Error: {$this->aiModel->name}", [
                'analysis_id' => $this->analysis->id,
                'provider' => $this->aiModel->name,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function getPromptForProvider(): string
    {
        $basePrompt = "Analyze the website {$this->analysis->target_url} and provide industry insights.";

        return $basePrompt;
    }

    private function callAiProvider(string $prompt): array
    {
        $config = $this->aiModel->api_config;

        if (empty($config['api_key'])) {
            return ['success' => false, 'error' => 'API key not configured'];
        }

        $client = Http::withHeaders([
            'Content-Type' => 'application/json',
        ]);

        $payload = [];
        $url = '';
        $provider = strtolower($this->aiModel->provider_name);

        switch ($provider) {
            case 'openai':
                $client = $client->withToken($config['api_key']);
                $url = 'https://api.openai.com/v1/chat/completions';
                $payload = [
                    'model' => $this->aiModel->name,
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 4000,
                ];
                break;

            case 'anthropic':
                $client = $client->withHeaders([
                    'x-api-key' => $config['api_key'],
                    'anthropic-version' => '2023-06-01',
                ]);
                $url = 'https://api.anthropic.com/v1/messages';
                $payload = [
                    'model' => $this->aiModel->name,
                    'max_tokens' => 4000,
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                ];
                break;

            default:
                return ['success' => false, 'error' => "Unsupported AI provider: {$this->aiModel->provider_name}"];
        }

        try {
            $response = $client->post($url, $payload);

            if ($response->failed()) {
                Log::error("AI API Call Failed for {$this->aiModel->name}", [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return ['success' => false, 'error' => $response->body()];
            }

            $data = $response->json();
            $content = '';
            $tokens_used = 0;

            switch ($provider) {
                case 'openai':
                    $content = $data['choices'][0]['message']['content'] ?? '';
                    $tokens_used = $data['usage']['total_tokens'] ?? 0;
                    break;

                case 'anthropic':
                    $content = $data['content'][0]['text'] ?? '';
                    $tokens_used = ($data['usage']['input_tokens'] ?? 0) + ($data['usage']['output_tokens'] ?? 0);
                    break;
            }

            return [
                'success' => true,
                'data' => $content,
                'tokens_used' => $tokens_used,
            ];
        } catch (\Exception $e) {
            Log::error("AI API Call Exception for {$this->aiModel->name}", [
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function parseAiResponse(string $response): array
    {
        return [
            'provider' => $this->aiModel->name,
            'raw_content' => $response,
            'parsed_at' => now()->toISOString(),
        ];
    }

    private function calculateCost(int $tokens): float
    {
        return $tokens * 0.00003; // Simple cost calculation
    }

    private function checkAnalysisCompletion(): void
    {
        $this->analysis->refresh();

        $totalExpected = AiModel::enabled()->count();
        $completed = $this->analysis->aiResponses()->whereIn('status', ['completed', 'failed'])->count();

        if ($completed >= $totalExpected) {
            $this->analysis->update(['status' => 'completed']);
        }
    }
}
