<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalysisMonitorController extends Controller
{
    public function index(Request $request)
    {
        $startOfMonth = now()->startOfMonth();
        $startOfPreviousMonth = now()->subMonthNoOverflow()->startOfMonth();
        $endOfPreviousMonth = now()->subMonthNoOverflow()->endOfMonth();

        // Get all active brands that have active prompts AND user/agency with trial type A-E
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

        $staleBrands = $brands->map(function (Brand $brand) use ($startOfMonth, $startOfPreviousMonth, $endOfPreviousMonth) {
            $totalActivePrompts = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->count();

            $latestAnalysis = BrandPrompt::where('brand_id', $brand->id)
                ->whereNotNull('analysis_completed_at')
                ->orderBy('analysis_completed_at', 'desc')
                ->first();

            $lastAnalysisDate = $latestAnalysis?->analysis_completed_at;
            $daysSince = $lastAnalysisDate ? now()->diffInDays($lastAnalysisDate) : null;
            $analyzedThisMonth = $lastAnalysisDate && $lastAnalysisDate->gte($startOfMonth);
            $analyzedLastMonth = $lastAnalysisDate
                && $lastAnalysisDate->gte($startOfPreviousMonth)
                && $lastAnalysisDate->lte($endOfPreviousMonth);

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
                    'trial_ends_at' => $owner?->trial_ends_at?->toDateTimeString(),
                ],
                'total_active_prompts' => $totalActivePrompts,
                'last_analysis_date' => $lastAnalysisDate?->toDateTimeString(),
                'days_since_analysis' => $daysSince,
                'analyzed_this_month' => $analyzedThisMonth,
                'analyzed_last_month' => $analyzedLastMonth,
            ];
        })
        ->filter(function ($b) {
            // Only show brands that were analyzed last month but not this month,
            // OR brands that were never analyzed
            if (! $b['last_analysis_date']) {
                return true;
            }

            return $b['analyzed_last_month'] && ! $b['analyzed_this_month'];
        })
        ->sortByDesc('days_since_analysis')
        ->values();

        return Inertia::render('admin/analysis-monitor/index', [
            'brands' => $staleBrands,
            'currentMonth' => now()->format('F Y'),
            'totalCount' => $staleBrands->count(),
        ]);
    }
}
