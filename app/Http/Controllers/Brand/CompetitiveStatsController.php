<?php

namespace App\Http\Controllers\Brand;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Services\AIPromptService;
use App\Services\CompetitiveAnalysisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CompetitiveStatsController extends Controller
{
    protected $competitiveAnalysisService;

    public function __construct()
    {
        $this->competitiveAnalysisService = new CompetitiveAnalysisService(new AIPromptService);
    }

    /**
     * Display competitive stats for a brand
     */
    public function index(Brand $brand)
    {
        // Get the latest competitive stats with trends
        $stats = $this->competitiveAnalysisService->getLatestStatsWithTrends($brand);

        // Get analysis history count
        $totalAnalyses = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->selectRaw('COUNT(DISTINCT analysis_session_id) as count')
            ->value('count') ?? 0;

        // Check if analysis is needed
        $needsAnalysis = $this->competitiveAnalysisService->brandNeedsAnalysis($brand);

        // Get competitors count
        $competitorsCount = $brand->competitors()->whereNotNull('domain')->count();

        return Inertia::render('brands/competitive-stats/index', [
            'brand' => $brand->load('competitors'),
            'stats' => $stats,
            'totalAnalyses' => $totalAnalyses,
            'needsAnalysis' => $needsAnalysis,
            'competitorsCount' => $competitorsCount,
            'canAnalyze' => ! empty($brand->website) && $competitorsCount > 0,
        ]);
    }

    /**
     * Run competitive analysis for a brand
     */
    public function runAnalysis(Request $request, Brand $brand)
    {
        try {
            // Validate that the brand can be analyzed
            if (empty($brand->website)) {
                return back()->with('error', 'Brand must have a website to perform competitive analysis.');
            }

            $competitorsCount = $brand->competitors()->whereNotNull('domain')->count();
            if ($competitorsCount === 0) {
                return back()->with('error', 'Brand must have competitors with websites to perform competitive analysis.');
            }

            // Check if recent analysis exists unless forced
            $force = $request->boolean('force', false);
            if (! $force && ! $this->competitiveAnalysisService->brandNeedsAnalysis($brand, 6)) {
                return back()->with('error', 'Brand was analyzed recently. Use force option to run again.');
            }

            // Run the analysis
            $results = $this->competitiveAnalysisService->analyzeBrandCompetitiveStats($brand);

            if (empty($results)) {
                return back()->with('error', 'Failed to generate competitive analysis. Please check the logs.');
            }

            Log::info('Manual competitive analysis completed', [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
                'results_count' => count($results),
                'user_id' => Auth::id(),
            ]);

            return back()->with('success', "Successfully analyzed {$brand->name} and generated ".count($results).' competitive statistics.');

        } catch (\Exception $e) {
            Log::error('Manual competitive analysis failed', [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return back()->with('error', 'Analysis failed: '.$e->getMessage());
        }
    }

    /**
     * Show competitive analysis history
     */
    public function history(Brand $brand)
    {
        // Get all analysis sessions with stats
        $history = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->with('competitor')
            ->orderBy('analyzed_at', 'desc')
            ->get()
            ->groupBy('analysis_session_id')
            ->map(function ($sessionStats, $sessionId) {
                $firstStat = $sessionStats->first();

                return [
                    'session_id' => $sessionId,
                    'analyzed_at' => $firstStat->analyzed_at,
                    'stats_count' => $sessionStats->count(),
                    'brand_stat' => $sessionStats->where('entity_type', 'brand')->first(),
                    'competitor_stats' => $sessionStats->where('entity_type', 'competitor')->values(),
                ];
            })
            ->values();

        return Inertia::render('brands/competitive-stats/history', [
            'brand' => $brand,
            'history' => $history,
        ]);
    }

    /**
     * Get competitive stats data for API calls
     */
    public function getData(Brand $brand)
    {
        $stats = $this->competitiveAnalysisService->getLatestStatsWithTrends($brand);

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'needs_analysis' => $this->competitiveAnalysisService->brandNeedsAnalysis($brand),
        ]);
    }

    /**
     * Delete a specific analysis session
     */
    public function deleteSession(Brand $brand, string $sessionId)
    {
        try {
            $deletedCount = BrandCompetitiveStat::where('brand_id', $brand->id)
                ->where('analysis_session_id', $sessionId)
                ->delete();

            if ($deletedCount > 0) {
                Log::info('Competitive analysis session deleted', [
                    'brand_id' => $brand->id,
                    'session_id' => $sessionId,
                    'deleted_count' => $deletedCount,
                    'user_id' => Auth::id(),
                ]);

                return back()->with('success', "Deleted analysis session with {$deletedCount} records.");
            } else {
                return back()->with('error', 'Analysis session not found.');
            }

        } catch (\Exception $e) {
            Log::error('Failed to delete competitive analysis session', [
                'brand_id' => $brand->id,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return back()->with('error', 'Failed to delete analysis session: '.$e->getMessage());
        }
    }
}
