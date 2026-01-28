<?php

namespace App\Console\Commands;

use App\Models\AiModel;
use Illuminate\Console\Command;

class DebugAiModels extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:debug-models';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug AI model configurations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $models = AiModel::all();

        foreach ($models as $model) {
            $this->info("\n=== {$model->display_name} ({$model->name}) ===");
            $this->line('Enabled: '.($model->is_enabled ? 'YES' : 'NO'));
            $this->line("Order: {$model->order}");
            $this->line("Prompts per brand: {$model->prompts_per_brand}");

            if ($model->api_config) {
                $this->line('API Configuration:');
                foreach ($model->api_config as $key => $value) {
                    if ($key === 'api_key') {
                        $this->line("  {$key}: ".(empty($value) ? 'NOT SET' : 'SET ('.substr($value, 0, 10).'...)'));
                    } else {
                        $this->line("  {$key}: {$value}");
                    }
                }
            } else {
                $this->error('  No API configuration found!');
            }
        }

        return 0;
    }
}
