<?php

namespace App\Console\Commands;

use App\Jobs\ProcessBrandPromptAnalysis;
use App\Models\Brand;
use App\Models\BrandPrompt;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ProcessBrandPromptsAnalysis extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'brand:analyze-prompts 
                            {--brand=* : Process specific brand IDs}
                            {--all : Process all brands}
                            {--force : Force re-analysis of already processed prompts}
                            {--session= : Optional session ID for tracking}
                            {--v|verbose : Show detailed information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process brand prompts to generate AI responses and competitor analysis';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $brandIds = $this->option('brand');
        $processAll = $this->option('all');
        $forceRegenerate = $this->option('force');
        $sessionId = $this->option('session') ?: Str::uuid()->toString();
        $verbose = $this->option('verbose');

        if (! $brandIds && ! $processAll) {
            $this->error('Please specify either --brand=ID or --all option');

            return 1;
        }

        if ($processAll) {
            $brands = Brand::all();
            $this->info('Processing prompts for all '.$brands->count().' brands...');
        } else {
            $brands = Brand::whereIn('id', $brandIds)->get();
            $notFound = array_diff($brandIds, $brands->pluck('id')->toArray());

            if (! empty($notFound)) {
                $this->warn('Brands not found: '.implode(', ', $notFound));
            }

            if ($brands->isEmpty()) {
                $this->error('No valid brands found');

                return 1;
            }

            $this->info('Processing prompts for '.$brands->count().' brand(s): '.$brands->pluck('name')->implode(', '));
        }

        $totalJobs = 0;
        $progressBar = $this->output->createProgressBar($brands->count());
        $progressBar->start();

        foreach ($brands as $brand) {
            // Get total prompts without any filtering (to debug)
            $allPromptsCount = BrandPrompt::withoutGlobalScopes()->where('brand_id', $brand->id)->count();
            $activePromptsCount = BrandPrompt::withoutGlobalScopes()->where('brand_id', $brand->id)->where('is_active', true)->count();
            $brandPromptsCount = BrandPrompt::where('brand_id', $brand->id)->count(); // With global scope (post_id is null)

            // Get only active brand prompts (post_id is null due to BrandPrompt global scope)
            $prompts = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->get();

            $this->newLine();
            $this->info("Brand: {$brand->name}");
            $this->line("  - All prompts in DB: {$allPromptsCount}");
            $this->line("  - Active prompts: {$activePromptsCount}");
            $this->line("  - Brand-type prompts (post_id IS NULL): {$brandPromptsCount}");
            $this->line("  - Active brand-type prompts: {$prompts->count()}");

            if ($prompts->isEmpty()) {
                $this->warn('  → No active brand prompts to process');
                $progressBar->advance();

                continue;
            }

            foreach ($prompts as $prompt) {
                // Skip if already analyzed and not forcing regeneration
                if (! $forceRegenerate &&
                    $prompt->analysis_completed_at &&
                    $prompt->ai_response) {
                    if ($verbose) {
                        $this->line("  Skipping prompt #{$prompt->id} (already analyzed)");
                    }

                    continue;
                }

                if ($verbose) {
                    $this->line("  Queueing prompt #{$prompt->id}: ".substr($prompt->prompt, 0, 50).'...');
                }

                ProcessBrandPromptAnalysis::dispatch($prompt, $sessionId, $forceRegenerate)
                    ->onQueue('default');

                $totalJobs++;
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();

        if ($totalJobs > 0) {
            $this->info("Queued {$totalJobs} analysis jobs with session ID: {$sessionId}");
            $this->info('Monitor progress with: php artisan queue:work');
        } else {
            $this->info('No prompts needed analysis. Use --force to re-analyze existing ones.');
        }

        return 0;
    }
}
