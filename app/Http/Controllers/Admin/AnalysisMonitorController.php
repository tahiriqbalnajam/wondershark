<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AnalysisMonitorController extends Controller
{
    /**
     * Get all active brands that have active prompts AND user/agency with trial type A-E
     * that have NOT been analyzed today.
     */
    private function getStaleBrands()
    {
        $brands = Brand::where('status', 'active')
            ->whereHas('prompts', function ($q) {
                $q->where('is_active', true);
            })
            ->where(function ($q) {
                $q->whereHas('user', function ($sub) {
                    $sub->whereNotNull('trial_type')
                        ->whereIn('trial_type', ['A', 'B', 'C', 'D', 'E']);
                })->orWhereHas('agency', function ($sub) {
                    $sub->whereNotNull('trial_type')
                        ->whereIn('trial_type', ['A', 'B', 'C', 'D', 'E']);
                });
            })
            ->with(['agency:id,name,email,trial_type,trial_ends_at', 'user:id,name,email,trial_type,trial_ends_at'])
            ->get();

        return $brands->map(function (Brand $brand) {
            $totalActivePrompts = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->count();

            $latestAnalysis = BrandPrompt::where('brand_id', $brand->id)
                ->whereNotNull('analysis_completed_at')
                ->orderBy('analysis_completed_at', 'desc')
                ->first();

            $lastAnalysisDate = $latestAnalysis?->analysis_completed_at;
            $analyzedToday = $lastAnalysisDate && $lastAnalysisDate->utc()->isSameDay(now()->utc());

            // Also check if competitive stats were updated today
            $latestCompetitiveStat = \DB::table('brand_competitive_stats')
                ->where('brand_id', $brand->id)
                ->orderBy('analyzed_at', 'desc')
                ->first();
            $competitiveStatsToday = $latestCompetitiveStat && \Carbon\Carbon::parse($latestCompetitiveStat->analyzed_at)->utc()->isSameDay(now()->utc());

            // Use brand user if exists, otherwise agency user
            $owner = $brand->user ?? $brand->agency;

            return [
                'id' => $brand->id,
                'name' => $brand->name,
                'agency' => $brand->agency ? [
                    'id' => $brand->agency->id,
                    'name' => $brand->agency->name,
                ] : null,
                'owner' => $owner ? [
                    'id' => $owner->id,
                    'name' => $owner->name,
                    'email' => $owner->email,
                ] : null,
                'plan' => [
                    'selected_option' => $owner?->trial_type ?? '-',
                    'trial_ends_at' => $owner?->trial_ends_at?->format('M j, Y'),
                    'is_trial_expired' => $owner?->trial_ends_at?->isPast() ?? false,
                ],
                'total_active_prompts' => $totalActivePrompts,
                'last_analysis_date' => $lastAnalysisDate?->toDateTimeString(),
                'analyzed_today' => $competitiveStatsToday || $analyzedToday,
            ];
        })
        ->filter(function ($b) {
            // Exclude brands with expired trials
            if ($b['plan']['is_trial_expired']) {
                return false;
            }

            if (! $b['last_analysis_date']) {
                return true;
            }

            return ! $b['analyzed_today'];
        })
        ->values();
    }

    public function index(Request $request)
    {
        $staleBrands = $this->getStaleBrands();

        return Inertia::render('admin/analysis-monitor/index', [
            'brands' => $staleBrands,
            'today' => now()->format('F j, Y'),
            'totalCount' => $staleBrands->count(),
        ]);
    }

    public function analyzeAll()
    {
        $staleBrands = $this->getStaleBrands();
        $count = 0;
        $failed = [];

        foreach ($staleBrands as $brandData) {
            $brand = Brand::find($brandData['id']);
            if (! $brand) {
                continue;
            }

            try {
                Artisan::call('brand:analyze-prompts', [
                    '--brand' => [$brand->id],
                    '--force' => true,
                ]);

                Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $brand->id,
                    '--regenerate' => true,
                ]);

                $count++;
            } catch (\Exception $e) {
                $failed[] = $brand->name;
                Log::error('Failed to trigger brand analysis in bulk', [
                    'brand_id' => $brand->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if (count($failed) > 0) {
            return redirect()->route('admin.analysis-monitor.index')
                ->with('error', "Analyzed {$count} brands. Failed for: " . implode(', ', $failed));
        }

        return redirect()->route('admin.analysis-monitor.index')
            ->with('success', "Analysis triggered for {$count} brand(s).");
    }

    public function analyze(Brand $brand)
    {
        try {
            Artisan::call('brand:analyze-prompts', [
                '--brand' => [$brand->id],
                '--force' => true,
            ]);

            Artisan::call('brand:recalculate-visibility', [
                '--brand' => $brand->id,
                '--regenerate' => true,
            ]);

            Log::info('Admin triggered brand analysis from monitor', [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
            ]);

            return redirect()->route('admin.analysis-monitor.index')
                ->with('success', "Analysis triggered for {$brand->name}.");
        } catch (\Exception $e) {
            Log::error('Failed to trigger brand analysis from monitor', [
                'brand_id' => $brand->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('admin.analysis-monitor.index')
                ->with('error', "Failed to analyze {$brand->name}: " . $e->getMessage());
        }
    }
}
