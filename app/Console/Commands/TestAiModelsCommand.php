<?php

namespace App\Console\Commands;

use App\Jobs\TestAiModels;
use Illuminate\Console\Command;

class TestAiModelsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:test-models';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test all enabled AI models and disable failing ones';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting AI models health check...');

        $job = new TestAiModels;
        $job->handle();

        $this->info('AI models health check completed.');

        return Command::SUCCESS;
    }
}
