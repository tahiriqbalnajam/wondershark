<?php

namespace App\Jobs;

use App\Jobs\ProcessBrandPromptAnalysis;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AnalyzeBrandCompetitiveStats implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 2;

    /**
     * How long the dispatch lock is kept. It is released as soon as the job
     * starts processing, so this only needs to cover the debounce delay plus
     * time spent waiting in the queue.
     */
    public int $uniqueFor = 900;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Brand $brand
    ) {}

    /**
     * One brand-level analysis at a time. Multiple competitor/region changes
     * in the same window collapse into a single run.
     */
    public function uniqueId(): string
    {
        return 'brand-analysis:'.$this->brand->id;
    }

    /**
     * Debounced dispatch for brand-level analysis.
     *
     * The delayed job reads the brand, competitors and prompts when it runs,
     * so every change made during the delay is picked up. A change that
     * arrives while the job is running queues at most one follow-up run
     * because ShouldBeUniqueUntilProcessing releases the lock at job start.
     */
    public static function schedule(Brand $brand, int $delaySeconds = 60): void
    {
        static::dispatch($brand)->delay(now()->addSeconds($delaySeconds));
    }

    /**
     * Back off before retrying a failed run (e.g. AI provider 429/timeout).
     */
    public function backoff(): array
    {
        return [120];
    }

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
             // Generate the competitive-stats session ID upfront so we can dispatch
            // the patient-forecast batch against the exact session that was written.
            $competitiveSessionId = Str::uuid()->toString();

            // A failed BVI call must not block prompt analysis. Prompt jobs are
            // the user-visible "analysis progress"; the scheduled
            // brands:analyze-competitive-stats command retries the BVI refresh.
            try {
                $competitiveAnalysis->analyzeBrandCompetitiveStats($this->brand, $competitiveSessionId);
            } catch (\Exception $e) {
                Log::error('Competitive stats analysis failed; continuing with prompt analysis', [
                    'brand_id' => $this->brand->id,
                    'competitive_session_id' => $competitiveSessionId,
                    'error' => $e->getMessage(),
                ]);
            }

            // Dispatch the batched patient-acquisition forecast job for this session.
            // The job skips silently if the brand has no procedure/region or no BVI stats.
            try {
                ProcessPatientForecastBatch::dispatch($this->brand, $competitiveSessionId)
                    ->onQueue('default');
            } catch (\Exception $e) {
                Log::error('Failed to dispatch patient forecast batch; continuing', [
                    'brand_id' => $this->brand->id,
                    'competitive_session_id' => $competitiveSessionId,
                    'error' => $e->getMessage(),
                ]);
            }

            // A new run supersedes earlier failures: clear stale failure markers
            // so the dashboard shows progress instead of an old failure banner.
            BrandPrompt::where('brand_id', $this->brand->id)
                ->where('is_active', true)
                ->whereNull('analysis_completed_at')
                ->update([
                    'analysis_failed_at' => null,
                    'analysis_error' => null,
                ]);

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

            try {
                Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $this->brand->id,
                    '--regenerate' => true,
                ]);
            } catch (\Exception $e) {
                // Prompt jobs are already queued; don't fail the whole run
                // (and retry duplicate work) because the recalc failed.
                Log::error('Visibility recalculation failed after dispatching prompt analysis', [
                    'brand_id' => $this->brand->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('Queued competitive analysis completed', [
                'brand_id' => $this->brand->id,
                'competitive_session_id' => $competitiveSessionId,
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
