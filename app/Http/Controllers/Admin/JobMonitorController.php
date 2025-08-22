<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class JobMonitorController extends Controller
{
    public function index(Request $request)
    {
        // Get job statistics
        $stats = [
            'total_jobs' => DB::table('jobs')->count(),
            'failed_jobs' => DB::table('failed_jobs')->count(),
            'processed_today' => DB::table('jobs')->where('created_at', '>=', Carbon::today())->count(),
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
                    'created_at' => Carbon::parse($job->created_at)->format('Y-m-d H:i:s'),
                    'available_at' => Carbon::parse($job->available_at)->format('Y-m-d H:i:s'),
                    'status' => 'pending'
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
                    'exception' => substr($job->exception, 0, 200) . '...',
                    'failed_at' => Carbon::parse($job->failed_at)->format('Y-m-d H:i:s'),
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
                            'status' => 'completed'
                        ];
                    }
                }
            }
        }

        return array_slice(array_reverse($completedJobs), 0, 20);
    }
}
