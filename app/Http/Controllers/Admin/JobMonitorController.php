<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\DateFormat;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class JobMonitorController extends Controller
{
    public function index(Request $request)
    {
        // Get job statistics
        $stats = [
            'total_jobs' => DB::table('jobs')->count(),
            'failed_jobs' => DB::table('failed_jobs')->count(),
            // Completed jobs are deleted from the `jobs` table as they are
            // processed, so "processed today" counts today's completion log
            // entries instead of pending rows, which would only mirror the
            // pending count during a backlog and show 0 at rest.
            'processed_today' => $this->countTodaysCompletedJobs(),
        ];

        // Get recent jobs
        $jobs = DB::table('jobs')
            ->select('id', 'queue', 'payload', 'attempts', 'created_at', 'available_at')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($job) {
                $payload = json_decode($job->payload, true);
                $commandName = $payload['displayName'] ?? 'Unknown Job';

                return [
                    'id' => $job->id,
                    'queue' => $job->queue,
                    'job_name' => $commandName,
                    'attempts' => $job->attempts,
                    'created_at' => DateFormat::dbToIso($job->created_at),
                    'available_at' => DateFormat::dbToIso($job->available_at),
                    'status' => 'pending',
                ];
            });

        // Get failed jobs
        $failedJobs = DB::table('failed_jobs')
            ->select('id', 'uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at')
            ->orderBy('failed_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($job) {
                $payload = json_decode($job->payload, true);
                $commandName = $payload['displayName'] ?? 'Unknown Job';

                return [
                    'id' => $job->id,
                    'uuid' => $job->uuid,
                    'connection' => $job->connection,
                    'queue' => $job->queue,
                    'job_name' => $commandName,
                    'exception' => substr($job->exception, 0, 200).'...',
                    'failed_at' => DateFormat::dbToIso($job->failed_at),
                ];
            });

        // Get recently completed jobs from application logs (if available)
        $recentCompletedJobs = $this->getRecentCompletedJobs();

        return Inertia::render('admin/jobs/index', [
            'stats' => $stats,
            'jobs' => $jobs,
            'failedJobs' => $failedJobs,
            'completedJobs' => $recentCompletedJobs,
        ]);
    }

    public function retry(Request $request, $jobId)
    {
        try {
            // Retry failed job
            DB::table('failed_jobs')->where('id', $jobId)->delete();

            return response()->json(['success' => true, 'message' => 'Job queued for retry']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function delete(Request $request, $jobId)
    {
        try {
            DB::table('failed_jobs')->where('id', $jobId)->delete();

            return response()->json(['success' => true, 'message' => 'Failed job deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function clear(Request $request)
    {
        try {
            $type = $request->input('type', 'failed');

            if ($type === 'failed') {
                DB::table('failed_jobs')->truncate();
                $message = 'All failed jobs cleared';
            } else {
                DB::table('jobs')->truncate();
                $message = 'All pending jobs cleared';
            }

            return response()->json(['success' => true, 'message' => $message]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Count today's completed jobs from the application log. Processed database
     * queue jobs are deleted, so the log is the only record a completion
     * happened. Counts the job-classes' own completion markers, each of which
     * is logged once per successful run: ProcessBrandPromptAnalysis logs
     * "Successfully completed brand prompt analysis" and GeneratePostPrompts
     * logs "Successfully generated prompts for post".
     */
    private function countTodaysCompletedJobs(?string $logFile = null): int
    {
        $logFile ??= storage_path('logs/laravel.log');
        $today = Carbon::today()->toDateString();
        $count = 0;

        try {
            if (! is_file($logFile)) {
                return 0;
            }

            // Read only the tail — the daily volume lands at the bottom of the file.
            $handle = fopen($logFile, 'r');
            $maxBytes = 2_000_000;
            clearstatcache();
            if (filesize($logFile) > $maxBytes) {
                fseek($handle, -$maxBytes, SEEK_END);
                fgets($handle); // discard the partial line the seek lands mid-way through
            }

            while (($line = fgets($handle)) !== false) {
                // Log lines start with "[Y-m-d H:i:s] env.LEVEL: message"
                if (str_contains($line, 'Successfully completed brand prompt analysis')
                    || str_contains($line, 'Successfully generated prompts for post')) {
                    if (substr($line, 1, 10) === $today) {
                        $count++;
                    }
                }
            }
            fclose($handle);
        } catch (\Throwable $e) {
            // A missing or unreadable log must never break the monitor page.
            Log::warning('Could not count completed jobs from log', ['error' => $e->getMessage()]);
        }

        return $count;
    }

    private function getRecentCompletedJobs()
    {
        // Try to get recent completed jobs from Laravel logs
        $logFile = storage_path('logs/laravel.log');
        $completedJobs = [];

        if (file_exists($logFile)) {
            $lines = file($logFile);
            $recentLines = array_slice($lines, -200); // Get last 200 lines

            foreach ($recentLines as $line) {
                if (strpos($line, 'Successfully generated prompts for post') !== false) {
                    preg_match('/\[(.*?)\]/', $line, $dateMatch);
                    preg_match('/post_id.*?(\d+)/', $line, $postIdMatch);

                    if ($dateMatch && $postIdMatch) {
                        $completedJobs[] = [
                            'job_name' => 'GeneratePostPrompts',
                            'post_id' => $postIdMatch[1],
                            'completed_at' => $dateMatch[1],
                            'status' => 'completed',
                        ];
                    }
                }
            }
        }

        return array_slice(array_reverse($completedJobs), 0, 20);
    }
}
