<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

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
                $analysisResults = $this->competitiveAnalysisService->analyzeBrandCompetitiveStats($brand);

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
}
