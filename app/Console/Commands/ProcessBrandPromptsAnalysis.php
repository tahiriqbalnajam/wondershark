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
                            {--session= : Optional session ID for tracking}';

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

        if (!$brandIds && !$processAll) {
            $this->error('Please specify either --brand=ID or --all option');
            return 1;
        }

        if ($processAll) {
            $brands = Brand::all();
            $this->info("Processing prompts for all " . $brands->count() . " brands...");
        } else {
            $brands = Brand::whereIn('id', $brandIds)->get();
            $notFound = array_diff($brandIds, $brands->pluck('id')->toArray());
            
            if (!empty($notFound)) {
                $this->warn("Brands not found: " . implode(', ', $notFound));
            }
            
            if ($brands->isEmpty()) {
                $this->error('No valid brands found');
                return 1;
            }
            
            $this->info("Processing prompts for " . $brands->count() . " brand(s): " . $brands->pluck('name')->implode(', '));
        }

        $totalJobs = 0;
        $progressBar = $this->output->createProgressBar($brands->count());
        $progressBar->start();

        foreach ($brands as $brand) {
            $prompts = BrandPrompt::where('brand_id', $brand->id)->get();
            
            if ($prompts->isEmpty()) {
                $this->newLine();
                $this->warn("No prompts found for brand: {$brand->name}");
                $progressBar->advance();
                continue;
            }

            foreach ($prompts as $prompt) {
                // Skip if already analyzed and not forcing regeneration
                if (!$forceRegenerate && 
                    $prompt->analysis_completed_at && 
                    $prompt->ai_response) {
                    continue;
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
            $this->info("Monitor progress with: php artisan queue:work");
        } else {
            $this->info("No prompts needed analysis. Use --force to re-analyze existing ones.");
        }

        return 0;
    }
}
