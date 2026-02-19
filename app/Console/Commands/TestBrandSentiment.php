<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BrandPrompt;
use Illuminate\Support\Str;

class TestBrandSentiment extends Command
{
    protected $signature = 'brand:test-sentiment {limit=5}';
    protected $description = 'Check the sentiment values stored in brand_prompts table';

    public function handle()
    {
        $limit = $this->argument('limit');
        $this->info("Fetching latest $limit brand prompts...");

        $prompts = BrandPrompt::latest('updated_at')->take($limit)->get();

        if ($prompts->isEmpty()) {
            $this->warn('No brand prompts found.');
            return;
        }

        foreach ($prompts as $prompt) {
            $comp = is_string($prompt->competitor_mentions) ? $prompt->competitor_mentions : json_encode($prompt->competitor_mentions);
            $comp = Str::limit($comp, 100);
            $sent = $prompt->sentiment ?? 'NULL';
            $this->line("ID: {$prompt->id} | Brand: {$prompt->brand->name} | Sentiment: {$sent} | Comp: {$comp}");
        }
    }
}
