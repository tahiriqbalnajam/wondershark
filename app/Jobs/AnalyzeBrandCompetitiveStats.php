<?php

namespace App\Jobs;

use App\Models\Brand;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

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

            $competitiveAnalysis = new CompetitiveAnalysisService(new AIPromptService);
            $competitiveAnalysis->analyzeBrandCompetitiveStats($this->brand);

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
