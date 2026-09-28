<?php

namespace App\Jobs;

use App\Models\Brand;
use App\Services\PatientForecastService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessPatientForecastBatch implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Brand $brand,
        public string $analysisSessionId,
    ) {}

    public function handle(): void
    {
        try {
            // Skip silently if the brand has no procedure or region — the docx
            // methodology requires both. Dashboard cells show "—" for this session.
            if (empty($this->brand->procedure) || empty($this->brand->region)) {
                Log::info('Skipping patient forecast batch — brand missing procedure or region', [
                    'brand_id' => $this->brand->id,
                    'analysis_session_id' => $this->analysisSessionId,
                    'has_procedure' => ! empty($this->brand->procedure),
                    'has_region' => ! empty($this->brand->region),
                ]);

                return;
            }

            // Block AI processing if the brand owner's trial has expired and they
            // have no active subscription (mirrors AnalyzeBrandCompetitiveStats).
            $brandUser = \App\Models\User::find($this->brand->user_id ?? $this->brand->agency_id);
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                Log::info('Skipping patient forecast batch — trial expired, no active subscription', [
                    'brand_id' => $this->brand->id,
                    'user_id' => $brandUser->id,
                ]);

                return;
            }

            /** @var PatientForecastService $service */
            $service = app(PatientForecastService::class);

            $entitiesWithMarketShare = $service->computeSessionMarketShares(
                $this->brand,
                $this->analysisSessionId,
            );

            if (empty($entitiesWithMarketShare)) {
                Log::info('Skipping patient forecast batch — no BVI stats for session', [
                    'brand_id' => $this->brand->id,
                    'analysis_session_id' => $this->analysisSessionId,
                ]);

                return;
            }

            $prompt = $service->buildBatchedPrompt($this->brand, $entitiesWithMarketShare);

            $aiResponse = $service->callAIForBatchedForecast($prompt);

            $perEntityResults = $service->parseAndComputeAll(
                $aiResponse['analysis'],
                $this->brand,
                $this->analysisSessionId,
                $entitiesWithMarketShare,
            );

            $service->storeResults(
                $this->analysisSessionId,
                $perEntityResults,
                $aiResponse['ai_model_id'],
                $aiResponse['raw_response'] ?? null,
                $prompt,
            );

            Log::info('Patient forecast batch completed', [
                'brand_id' => $this->brand->id,
                'analysis_session_id' => $this->analysisSessionId,
                'entity_count' => count($perEntityResults),
            ]);
        } catch (\Exception $e) {
            Log::error('Patient forecast batch failed', [
                'brand_id' => $this->brand->id,
                'analysis_session_id' => $this->analysisSessionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Patient forecast batch job failed permanently', [
            'brand_id' => $this->brand->id,
            'analysis_session_id' => $this->analysisSessionId,
            'error' => $exception->getMessage(),
            'attempts' => $this->tries,
        ]);
    }
}