<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use App\Services\PatientForecastService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RunCompetitiveAnalysis extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'brands:analyze-competitive-stats 
                           {--brand= : Specific brand ID to analyze}
                           {--force : Force analysis even if recently analyzed}
                           {--hours=24 : Hours threshold for recent analysis}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run competitive analysis for brands to collect visibility, sentiment, and position data';

    protected $competitiveAnalysisService;

    public function __construct()
    {
        parent::__construct();
        $this->competitiveAnalysisService = new CompetitiveAnalysisService(new AIPromptService);
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting competitive analysis...');

        $brandId = $this->option('brand');
        $force = $this->option('force');
        $hoursThreshold = (int) $this->option('hours');

        if ($brandId) {
            // Analyze specific brand
            $brand = Brand::find($brandId);
            if (! $brand) {
                $this->error("❌ Brand with ID {$brandId} not found.");

                return Command::FAILURE;
            }
            $brands = collect([$brand]);
        } else {
            // Get brands that need analysis
            if ($force) {
                $brands = Brand::whereHas('competitors', function ($query) {
                    $query->whereNotNull('domain');
                })->get();
            } else {
                $brands = $this->competitiveAnalysisService->getBrandsNeedingAnalysis($hoursThreshold);
            }
        }

        if ($brands->isEmpty()) {
            $this->info('✅ No brands found for analysis.');

            return Command::SUCCESS;
        }

        $this->info("📊 Found {$brands->count()} brands to analyze.");

        // Create progress bar
        $progressBar = $this->output->createProgressBar($brands->count());
        $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% -- %message%');

        $successCount = 0;
        $failureCount = 0;
        $results = [];

        foreach ($brands as $index => $brand) {
            $progressBar->setMessage("Analyzing: {$brand->name}");
            $progressBar->advance();

            // Skip if the brand owner's trial has expired and they have no active subscription
            $brandUser = \App\Models\User::find($brand->user_id ?? $brand->agency_id);
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                Log::info('Skipping competitive analysis — trial expired, no active subscription', [
                    'brand_id' => $brand->id,
                    'user_id' => $brandUser->id,
                ]);

                continue;
            }

            try {
                $competitiveSessionId = Str::uuid()->toString();
                $analysisResults = $this->competitiveAnalysisService->analyzeBrandCompetitiveStats($brand, $competitiveSessionId);

                // Run the Phase 5 patient-acquisition forecast synchronously against
                // the same session. Skips silently if the brand has no procedure/region
                // (mirrors App\Jobs\ProcessPatientForecastBatch skip logic).
                $this->runPatientForecastSynchronously($brand, $competitiveSessionId);

                if (! empty($analysisResults)) {
                    $successCount++;
                    $results[] = [
                        'brand' => $brand->name,
                        'status' => 'success',
                        'stats_count' => count($analysisResults),
                    ];

                    $this->newLine();
                    $this->info("✅ Successfully analyzed {$brand->name} (".count($analysisResults).' stats collected)');
                } else {
                    $failureCount++;
                    $results[] = [
                        'brand' => $brand->name,
                        'status' => 'failed',
                        'error' => 'No results returned',
                    ];

                    $this->newLine();
                    $this->error("❌ Failed to analyze {$brand->name} (no results)");
                }

            } catch (\Exception $e) {
                $failureCount++;
                $results[] = [
                    'brand' => $brand->name,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];

                $this->newLine();
                $this->error("❌ Failed to analyze {$brand->name}: {$e->getMessage()}");

                Log::error('Competitive analysis command failed for brand', [
                    'brand_id' => $brand->id,
                    'brand_name' => $brand->name,
                    'error' => $e->getMessage(),
                ]);
            }

            // Add a small delay to avoid hitting API rate limits
            if ($index < $brands->count() - 1) {
                sleep(3);
            }
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->info('📈 Competitive Analysis Summary:');
        $this->info("✅ Successful: {$successCount}");
        $this->info("❌ Failed: {$failureCount}");

        if ($successCount > 0) {
            $this->newLine();
            $this->info('🎯 Successfully analyzed brands:');
            foreach ($results as $result) {
                if ($result['status'] === 'success') {
                    $this->line("  • {$result['brand']} ({$result['stats_count']} stats)");
                }
            }
        }

        if ($failureCount > 0) {
            $this->newLine();
            $this->error('💥 Failed analyses:');
            foreach ($results as $result) {
                if ($result['status'] === 'failed') {
                    $this->line("  • {$result['brand']}: {$result['error']}");
                }
            }
        }

        return $failureCount === 0 ? Command::SUCCESS : Command::FAILURE;
    }

    /**
     * Run the Phase 5 patient-acquisition forecast synchronously against the
     * given BVI session. Skips silently if the brand is missing procedure/region
     * or the brand owner cannot process analysis.
     */
    protected function runPatientForecastSynchronously(Brand $brand, string $competitiveSessionId): void
    {
        if (empty($brand->procedure) || empty($brand->region)) {
            Log::info('Skipping patient forecast — brand missing procedure or region', [
                'brand_id' => $brand->id,
                'analysis_session_id' => $competitiveSessionId,
            ]);

            return;
        }

        $brandUser = \App\Models\User::find($brand->user_id ?? $brand->agency_id);
        if ($brandUser && ! $brandUser->canProcessAnalysis()) {
            Log::info('Skipping patient forecast — trial expired, no active subscription', [
                'brand_id' => $brand->id,
                'user_id' => $brandUser->id,
            ]);

            return;
        }

        try {
            $service = app(PatientForecastService::class);

            $entities = $service->computeSessionMarketShares($brand, $competitiveSessionId);
            if (empty($entities)) {
                Log::info('Skipping patient forecast — no BVI stats for session', [
                    'brand_id' => $brand->id,
                    'analysis_session_id' => $competitiveSessionId,
                ]);

                return;
            }

            $prompt = $service->buildBatchedPrompt($brand, $entities);
            $aiResponse = $service->callAIForBatchedForecast($prompt);
            $results = $service->parseAndComputeAll($aiResponse['analysis'], $brand, $competitiveSessionId, $entities);
            $service->storeResults(
                $competitiveSessionId,
                $results,
                $aiResponse['ai_model_id'],
                $aiResponse['raw_response'] ?? null,
                $prompt,
            );

            $completed = count(array_filter($results, fn ($r) => ($r['status'] ?? '') === 'completed'));
            $failed = count($results) - $completed;

            Log::info('Patient forecast completed inline', [
                'brand_id' => $brand->id,
                'analysis_session_id' => $competitiveSessionId,
                'completed' => $completed,
                'failed' => $failed,
            ]);
        } catch (\Exception $e) {
            Log::error('Patient forecast failed inline', [
                'brand_id' => $brand->id,
                'analysis_session_id' => $competitiveSessionId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
