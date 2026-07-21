<?php

namespace App\Jobs;

use App\Jobs\ProcessBrandPromptAnalysis;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AnalyzeBrandCompetitiveStats implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 3;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Brand $brand
    ) {}

    public function handle(): void
    {
        try {
            Log::info('Starting queued competitive analysis', [
                'brand_id' => $this->brand->id,
                'brand_name' => $this->brand->name,
            ]);

            // Only run for active brands
            if ($this->brand->status !== 'active') {
                Log::info('Skipping competitive analysis — brand is not active', [
                    'brand_id' => $this->brand->id,
                    'brand_status' => $this->brand->status,
                ]);

                return;
            }

            // Block AI processing if the brand owner's trial has expired and they have no active subscription
            $brandUser = \App\Models\User::find($this->brand->user_id ?? $this->brand->agency_id);
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                Log::info('Skipping competitive analysis — trial expired, no active subscription', [
                    'brand_id' => $this->brand->id,
                    'user_id' => $brandUser->id,
                ]);

                return;
            }

            $competitiveAnalysis = new CompetitiveAnalysisService(new AIPromptService);
            $competitiveAnalysis->analyzeBrandCompetitiveStats($this->brand);

            // Dispatch prompt analysis for all active brand prompts
            $prompts = BrandPrompt::where('brand_id', $this->brand->id)
                ->where('is_active', true)
                ->get();

            $sessionId = Str::uuid()->toString();
            foreach ($prompts as $prompt) {
                ProcessBrandPromptAnalysis::dispatch($prompt, $sessionId, false, null)
                    ->onQueue('default');
            }

            Log::info('Dispatched brand prompt analysis jobs', [
                'brand_id' => $this->brand->id,
                'prompt_count' => $prompts->count(),
                'session_id' => $sessionId,
            ]);

            Artisan::call('brand:recalculate-visibility', [
                '--brand' => $this->brand->id,
                '--regenerate' => true,
            ]);

            Log::info('Queued competitive analysis completed', [
                'brand_id' => $this->brand->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Queued competitive analysis failed', [
                'brand_id' => $this->brand->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Competitive analysis job failed permanently', [
            'brand_id' => $this->brand->id,
            'error' => $exception->getMessage(),
            'attempts' => $this->tries,
        ]);
    }
}
