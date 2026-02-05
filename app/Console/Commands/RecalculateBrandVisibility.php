<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Services\VisibilityCalculationService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class RecalculateBrandVisibility extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'brand:recalculate-visibility
                            {--brand= : Specific brand ID to recalculate}
                            {--days=30 : Number of days to look back for prompts}
                            {--regenerate : Regenerate mentions from existing AI responses}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate brand visibility based on AI prompt mention data';

    /**
     * Execute the console command.
     */
    public function handle(VisibilityCalculationService $visibilityService): int
    {
        $brandId = $this->option('brand');
        $days = (int) $this->option('days');
        $regenerate = $this->option('regenerate');

        $this->info("Recalculating brand visibility (last {$days} days)...");

        if ($brandId) {
            $brands = Brand::where('id', $brandId)->get();
            if ($brands->isEmpty()) {
                $this->error("Brand with ID {$brandId} not found.");

                return 1;
            }
        } else {
            $brands = Brand::with(['competitors' => fn ($q) => $q->accepted()])->get();
        }

        $this->info("Processing {$brands->count()} brand(s)...");

        $bar = $this->output->createProgressBar($brands->count());
        $bar->start();

        foreach ($brands as $brand) {
            try {
                if ($regenerate) {
                    // Regenerate mentions from existing AI responses
                    $this->regenerateMentionsForBrand($brand, $visibilityService, $days);
                }

                // Calculate and update visibility stats
                $visibilityService->updateCompetitiveStats(
                    $brand,
                    now()->subDays($days),
                    now()
                );

                $bar->advance();
            } catch (\Exception $e) {
                $this->newLine();
                $this->error("Error processing brand {$brand->name}: {$e->getMessage()}");
                $bar->advance();
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('Brand visibility recalculation completed!');

        return 0;
    }

    /**
     * Regenerate mentions from existing AI responses for a brand
     */
    protected function regenerateMentionsForBrand(Brand $brand, VisibilityCalculationService $visibilityService, int $days): void
    {
        $prompts = BrandPrompt::where('brand_id', $brand->id)
            ->whereNotNull('ai_response')
            ->where('analysis_completed_at', '>=', now()->subDays($days))
            ->get();

        foreach ($prompts as $prompt) {
            // Generate a session ID for this batch
            $sessionId = Str::uuid()->toString();

            // Extract mentions from the AI response
            $visibilityService->extractAndLogMentions(
                $prompt,
                $brand,
                $prompt->ai_response,
                $prompt->ai_model_id,
                $sessionId
            );
        }
    }
}
