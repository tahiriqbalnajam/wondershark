<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Services\PatientForecastService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunPatientForecast extends Command
{
    protected $signature = 'brands:run-patient-forecast
                           {--brand= : Brand ID to forecast for}
                           {--session= : Specific analysis_session_id (defaults to latest)}';

    protected $description = 'Run the Phase 5 patient-acquisition forecast synchronously for a brand\'s latest (or specified) BVI session (no queue worker needed)';

    public function handle(): int
    {
        $brandId = $this->option('brand');
        $sessionId = $this->option('session');

        if (! $brandId) {
            $this->error('❌ --brand= is required.');

            return Command::FAILURE;
        }

        $brand = Brand::find($brandId);
        if (! $brand) {
            $this->error("❌ Brand {$brandId} not found.");

            return Command::FAILURE;
        }

        if (empty($brand->procedure) || empty($brand->region)) {
            $this->error("❌ Brand {$brand->name} is missing procedure or region — forecast cannot run.");
            $this->line("  procedure: ".($brand->procedure ?: '(empty)'));
            $this->line("  region:    ".($brand->region_string ?: '(empty)'));

            return Command::FAILURE;
        }

        $brandUser = \App\Models\User::find($brand->user_id ?? $brand->agency_id);
        if ($brandUser && ! $brandUser->canProcessAnalysis()) {
            $this->error("❌ Brand owner's trial has expired and no active subscription — forecast blocked.");

            return Command::FAILURE;
        }

        // Resolve the BVI session to forecast against.
        if ($sessionId) {
            $exists = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('analysis_session_id', $sessionId)
                ->exists();
            if (! $exists) {
                $this->error("❌ No BVI stats found for session {$sessionId} on brand {$brand->id}.");

                return Command::FAILURE;
            }
        } else {
            $latest = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->latest('analyzed_at')
                ->first();
            if (! $latest) {
                $this->error("❌ Brand {$brand->name} has no BVI stats. Run brands:analyze-competitive-stats first.");

                return Command::FAILURE;
            }
            $sessionId = $latest->analysis_session_id;
            $this->info("Using latest BVI session: {$sessionId} (analyzed at {$latest->analyzed_at})");
        }

        $this->info("🚀 Running patient forecast for brand: {$brand->name}");
        $this->info("  Session: {$sessionId}");
        $this->info("  Procedure: {$brand->procedure}");
        $this->info("  Region: {$brand->region_string}");

        try {
            $service = app(PatientForecastService::class);

            $entities = $service->computeSessionMarketShares($brand, $sessionId);
            if (empty($entities)) {
                $this->error("❌ No BVI stats found for session {$sessionId}.");

                return Command::FAILURE;
            }

            $this->info('📊 Entities to forecast: '.count($entities));

            $prompt = $service->buildBatchedPrompt($brand, $entities);
            $this->info('🤖 Calling AI...');
            $aiResponse = $service->callAIForBatchedForecast($prompt);

            $results = $service->parseAndComputeAll($aiResponse['analysis'], $brand, $sessionId, $entities);
            $service->storeResults($sessionId, $results, $aiResponse['ai_model_id'], $aiResponse['raw_response'] ?? null, $prompt);

            $completed = array_filter($results, fn ($r) => ($r['status'] ?? '') === 'completed');
            $failed = array_filter($results, fn ($r) => ($r['status'] ?? '') !== 'completed');

            $this->newLine();
            $this->info('📈 Forecast Summary:');
            $this->info('✅ Completed: '.count($completed));
            if (count($failed)) {
                $this->error('❌ Failed: '.count($failed));
                foreach ($failed as $ref => $r) {
                    $this->line("  • {$ref}: {$r['error_message']}");
                }
            }

            Log::info('Patient forecast command completed', [
                'brand_id' => $brand->id,
                'analysis_session_id' => $sessionId,
                'completed' => count($completed),
                'failed' => count($failed),
            ]);

            return count($failed) === 0 ? Command::SUCCESS : Command::FAILURE;
        } catch (\Exception $e) {
            $this->error("❌ Forecast failed: {$e->getMessage()}");

            Log::error('Patient forecast command failed', [
                'brand_id' => $brand->id,
                'analysis_session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);

            return Command::FAILURE;
        }
    }
}