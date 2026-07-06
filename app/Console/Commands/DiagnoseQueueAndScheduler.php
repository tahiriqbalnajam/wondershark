<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DiagnoseQueueAndScheduler extends Command
{
    protected $signature = 'diagnose:queue-scheduler {--brand= : Check specific brand analysis status}';

    protected $description = 'Diagnose queue worker, scheduler, and analysis pipeline health';

    public function handle(): int
    {
        $this->info('=== Queue & Scheduler Diagnostic ===');
        $this->newLine();

        // 1. Check failed jobs table
        $failedJobsCount = DB::table('failed_jobs')->count();
        $recentFailedJobs = DB::table('failed_jobs')
            ->where('failed_at', '>=', now()->subDays(7))
            ->count();

        $this->warn("Failed Jobs (total): {$failedJobsCount}");
        $this->warn("Failed Jobs (last 7 days): {$recentFailedJobs}");

        if ($recentFailedJobs > 0) {
            $this->error('  RECENT FAILURES DETECTED!');
            $latestFailures = DB::table('failed_jobs')
                ->where('failed_at', '>=', now()->subDays(7))
                ->select('id', 'connection', 'queue', 'failed_at', 'exception')
                ->orderBy('failed_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($latestFailures as $job) {
                $shortException = substr($job->exception, 0, 150);
                $this->line("    #{$job->id} | {$job->queue} | {$job->failed_at}");
                $this->line("    {$shortException}...");
            }
        }
        $this->newLine();

        // 2. Check pending jobs in queue (if using database driver)
        $pendingJobs = 0;
        try {
            $pendingJobs = DB::table('jobs')->count();
            $this->info("Pending jobs in queue: {$pendingJobs}");

            if ($pendingJobs > 0) {
                $oldestJob = DB::table('jobs')->min('available_at');
                $oldestJobTime = $oldestJob ? date('Y-m-d H:i:s', $oldestJob) : 'N/A';
                $this->warn("  Oldest pending job: {$oldestJobTime}");

                if ($oldestJob && now()->diffInHours(\Carbon\Carbon::createFromTimestamp($oldestJob)) > 24) {
                    $this->error('  JOBS ARE STUCK! Queue worker may be down.');
                }
            }
        } catch (\Exception $e) {
            $this->warn("Could not check jobs table: {$e->getMessage()}");
        }
        $this->newLine();

        // 3. Check last scheduler run
        $this->info('Scheduler Status:');
        $cacheKey = 'illuminate:schedule:mutex';
        $lastScheduleRun = Cache::get($cacheKey);
        if ($lastScheduleRun) {
            $this->line("  Last mutex found: yes (scheduler has run recently)");
        } else {
            $this->warn("  No scheduler mutex in cache.");
        }

        // Check if any scheduled commands have run recently via logs
        $recentAnalysisJobs = DB::table('brand_prompts')
            ->where('analysis_completed_at', '>=', now()->subDays(3))
            ->count();
        $this->line("  Prompts analyzed in last 3 days: {$recentAnalysisJobs}");

        if ($recentAnalysisJobs === 0) {
            $this->error('  NO ANALYSIS HAS RUN IN 3 DAYS!');
            $this->error('  Possible causes:');
            $this->error('    - Cron job stopped (check: crontab -l)');
            $this->error('    - Queue worker stopped (check: ps aux | grep queue:work)');
            $this->error('    - Server restarted and services not restarted');
        }
        $this->newLine();

        // 4. Check brand-specific status
        $brandId = $this->option('brand');
        if ($brandId) {
            $this->info("Brand #{$brandId} Analysis Status:");

            $activePrompts = DB::table('brand_prompts')
                ->where('brand_id', $brandId)
                ->where('is_active', true)
                ->count();

            $pendingAnalysis = DB::table('brand_prompts')
                ->where('brand_id', $brandId)
                ->where('is_active', true)
                ->whereNull('analysis_completed_at')
                ->count();

            $lastAnalyzed = DB::table('brand_prompts')
                ->where('brand_id', $brandId)
                ->whereNotNull('analysis_completed_at')
                ->max('analysis_completed_at');

            $lastMention = DB::table('brand_mentions')
                ->where('brand_id', $brandId)
                ->max('analyzed_at');

            $this->line("  Active prompts: {$activePrompts}");
            $this->line("  Pending analysis: {$pendingAnalysis}");
            $this->line("  Last prompt analyzed: " . ($lastAnalyzed ?? 'NEVER'));
            $this->line("  Last mention recorded: " . ($lastMention ?? 'NEVER'));

            if ($pendingAnalysis > 0) {
                $this->warn("  {$pendingAnalysis} prompts are waiting for analysis.");
            }

            if ($lastAnalyzed && now()->diffInDays($lastAnalyzed) > 3) {
                $daysAgo = now()->diffInDays($lastAnalyzed);
                $this->error("  Last analysis was {$daysAgo} days ago!");
            }
        }

        $this->newLine();
        $this->info('=== Recommendations ===');
        $this->line('1. Check cron is running: crontab -l | grep schedule:run');
        $this->line('2. Check queue worker: ps aux | grep "queue:work"');
        $this->line('3. If queue is down, restart: php artisan queue:work --daemon');
        $this->line('4. To manually fix brand 315: php artisan brand:analyze-prompts --brand=315 --force');
        $this->line('5. Then recalculate: php artisan brand:recalculate-visibility --brand=315 --regenerate');

        return 0;
    }
}
