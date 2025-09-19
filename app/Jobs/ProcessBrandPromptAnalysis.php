<?php

namespace App\Jobs;

use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Services\BrandPromptAnalysisService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessBrandPromptAnalysis implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600; // 10 minutes timeout
    public int $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public BrandPrompt $brandPrompt,
        public string $sessionId = '',
        public bool $forceRegenerate = false
    ) {}

    /**
     * Execute the job.
     */
    public function handle(BrandPromptAnalysisService $analysisService): void
    {
        try {
            Log::info("Starting brand prompt analysis", [
                'brand_prompt_id' => $this->brandPrompt->id,
                'brand_id' => $this->brandPrompt->brand_id,
                'prompt' => substr($this->brandPrompt->prompt, 0, 100) . '...',
                'force_regenerate' => $this->forceRegenerate
            ]);

            // Skip if already analyzed and not forcing regeneration
            if (!$this->forceRegenerate && 
                $this->brandPrompt->ai_response && 
                $this->brandPrompt->resources && 
                $this->brandPrompt->analysis_completed_at) {
                Log::info("Skipping already analyzed prompt", [
                    'brand_prompt_id' => $this->brandPrompt->id
                ]);
                return;
            }

            // Load brand with competitors
            $brand = $this->brandPrompt->brand()->with('competitors')->first();
            
            if (!$brand) {
                Log::error("Brand not found for prompt", [
                    'brand_prompt_id' => $this->brandPrompt->id,
                    'brand_id' => $this->brandPrompt->brand_id
                ]);
                return;
            }

            // Generate AI response and analyze
            $result = $analysisService->analyzePrompt($this->brandPrompt, $brand);

            // Update the brand prompt with results
            $this->brandPrompt->update([
                'ai_response' => $result['ai_response'],
                'resources' => json_encode($result['resources']),
                'sentiment' => $result['analysis']['sentiment'],
                'position' => $result['analysis']['position'],
                'visibility' => $result['analysis']['visibility'],
                'competitor_mentions' => json_encode($result['analysis']['competitor_mentions']),
                'analysis_completed_at' => now(),
                'session_id' => $this->sessionId ?: $this->brandPrompt->session_id,
            ]);

            Log::info("Successfully completed brand prompt analysis", [
                'brand_prompt_id' => $this->brandPrompt->id,
                'sentiment' => $result['analysis']['sentiment'],
                'position' => $result['analysis']['position'],
                'visibility' => $result['analysis']['visibility'],
                'resources_count' => count($result['resources'])
            ]);

        } catch (\Exception $e) {
            Log::error('Brand Prompt Analysis Failed', [
                'brand_prompt_id' => $this->brandPrompt->id,
                'brand_id' => $this->brandPrompt->brand_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Brand Prompt Analysis Job Failed Permanently', [
            'brand_prompt_id' => $this->brandPrompt->id,
            'brand_id' => $this->brandPrompt->brand_id,
            'error' => $exception->getMessage(),
            'attempts' => $this->tries
        ]);

        // Mark as failed
        $this->brandPrompt->update([
            'analysis_failed_at' => now(),
            'analysis_error' => $exception->getMessage()
        ]);
    }
}