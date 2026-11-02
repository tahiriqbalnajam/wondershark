<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs a long admin-console Artisan command on the queue.
 *
 * Commands such as brands:analyze-competitive-stats loop over brands, call AI
 * providers and run the patient forecast, which takes minutes. Executing them
 * inside the console's POST request (`Artisan::call`) exceeded the web server's
 * gateway timeout and returned a 504 while the work was still running.
 */
class RunArtisanCommand implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Stay below queue.connections.database.retry_after (1800s) so the database
     * queue does not re-reserve and run the job a second time while the first
     * worker is still processing it.
     */
    public int $timeout = 1700;

    public int $tries = 1;

    /**
     * Keep a second click (or a duplicate dispatch) from queueing the same work
     * again while this command is waiting or running.
     */
    public int $uniqueFor = 1700;

    public function __construct(
        public string $command,
        public array $parameters = []
    ) {}

    public function uniqueId(): string
    {
        return 'console-command:'.md5($this->command.'|'.json_encode($this->parameters));
    }

    public function handle(): void
    {
        Log::info('Running admin console command from the queue', [
            'command' => $this->command,
            'parameters' => $this->parameters,
        ]);

        $exitCode = Artisan::call($this->command, $this->parameters);

        Log::info('Admin console command finished', [
            'command' => $this->command,
            'parameters' => $this->parameters,
            'exit_code' => $exitCode,
            'output' => Artisan::output(),
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Admin console command failed', [
            'command' => $this->command,
            'parameters' => $this->parameters,
            'error' => $exception->getMessage(),
        ]);
    }
}
