<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Models\User;
use App\Services\CompetitiveAnalysisService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BrandVisibilityStatsController extends Controller
{
    public function index(Request $request)
    {
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id']);

        $stats = collect();
        $selectedBrand = null;

        if ($request->brand_id) {
            $selectedBrand = Brand::find($request->brand_id);

            if ($selectedBrand) {
                // Latest stat per entity
                $rows = BrandCompetitiveStat::with(['competitor', 'aiModel'])
                    ->where('brand_id', $selectedBrand->id)
                    ->whereIn('id', function ($sub) use ($selectedBrand) {
                        $sub->selectRaw('MAX(id)')
                            ->from('brand_competitive_stats')
                            ->where('brand_id', $selectedBrand->id)
                            ->groupBy(['entity_type', 'competitor_id']);
                    })
                    ->orderByRaw("entity_type = 'brand' DESC")
                    ->orderBy('visibility', 'desc')
                    ->get();

                // Get live visibility (period average with overrides applied) — same value
                // the brand dashboard shows, so the admin can see what clients will see.
                $liveStats = app(CompetitiveAnalysisService::class)
                    ->getMentionBasedVisibility($selectedBrand, 30);
                $liveByEntityKey = collect($liveStats)->keyBy(
                    fn ($s) => ($s['competitor_id'] ?? null) ? 'c_'.$s['competitor_id'] : 'brand'
                );

                // Check if each entity has ANY override in the last 30 days (not just the latest row)
                $startDate = now()->subDays(30);
                $entitiesWithOverrides = BrandCompetitiveStat::where('brand_id', $selectedBrand->id)
                    ->where('analyzed_at', '>=', $startDate)
                    ->whereNotNull('visibility_override')
                    ->select('entity_type', 'competitor_id')
                    ->get()
                    ->map(fn ($s) => ($s->competitor_id ? 'c_'.$s->competitor_id : 'brand'))
                    ->unique()
                    ->flip();

                $stats = $rows->map(function ($stat) use ($liveByEntityKey, $entitiesWithOverrides) {
                    $entityKey = $stat->competitor_id ? 'c_'.$stat->competitor_id : 'brand';
                    $liveVisibility = $liveByEntityKey->has($entityKey)
                        ? (float) $liveByEntityKey->get($entityKey)['visibility']
                        : (float) $stat->getEffectiveVisibility();

                    return [
                        'id' => $stat->id,
                        'entity_type' => $stat->entity_type,
                        'entity_name' => $stat->entity_name,
                        'entity_url' => $stat->entity_url,
                        'visibility' => $liveVisibility,
                        'sentiment' => $stat->sentiment,
                        'position' => (float) $stat->position,
                        'competitor_id' => $stat->competitor_id,
                        'has_manual_override' => $entitiesWithOverrides->has($entityKey),
                        'analyzed_at' => $stat->analyzed_at?->toDateTimeString(),
                    ];
                });
            }
        }

        return Inertia::render('admin/visibility-stats/index', [
            'agencies' => $agencies,
            'brands' => $brands,
            'stats' => $stats,
            'selectedBrand' => $selectedBrand ? ['id' => $selectedBrand->id, 'name' => $selectedBrand->name] : null,
            'filters' => [
                'agency_id' => $request->agency_id,
                'brand_id' => $request->brand_id,
            ],
        ]);
    }

    /** AJAX: per-day breakdown for one entity */
    public function daily(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'entity_type' => 'required|in:brand,competitor',
            'competitor_id' => 'nullable|exists:competitors,id',
            'days' => 'nullable|integer|min:1|max:90',
        ]);

        $brand = Brand::findOrFail($validated['brand_id']);
        $days = (int) ($validated['days'] ?? 30);
        $competitorId = $validated['competitor_id'] ?? null;
        $startDate = now()->subDays($days - 1)->startOfDay();
        $endDate = now()->endOfDay();

        // Get stats from brand_competitive_stats.
        // Using brand_competitive_stats instead of brand_mentions so we show a value for every
        // date an analysis session ran, even when the entity was not mentioned in prompts.
        $statsQuery = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('entity_type', $validated['entity_type'])
            ->whereBetween('analyzed_at', [$startDate, $endDate]);
        $competitorId ? $statsQuery->where('competitor_id', $competitorId) : $statsQuery->whereNull('competitor_id');

        // Group in PHP using app timezone so dates match the loop's ->toDateString() output.
        // MySQL DATE(analyzed_at) uses UTC which can differ from the app timezone for sessions
        // running close to midnight UTC, causing lookup misses for those dates.
        $statsByDate = $statsQuery
            ->get()
            ->groupBy(fn ($s) => $s->analyzed_at->toDateString())
            ->map(function ($dayGroup) {
                $stat = $dayGroup->last(); // Latest entry for that day

                return [
                    'ai_visibility' => round((float) $stat->visibility, 2),
                    'manual_visibility' => $stat->visibility_override ? round((float) $stat->visibility_override, 2) : null,
                    'override_reason' => $stat->override_reason,
                ];
            });

        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $data = $statsByDate[$date] ?? null;

            $result[] = [
                'date' => $date,
                'ai_visibility' => $data['ai_visibility'] ?? null,
                'manual_visibility' => $data['manual_visibility'] ?? null,
                'override_reason' => $data['override_reason'] ?? null,
            ];
        }

        return response()->json(['days' => $result]);
    }

    /** Save a manual value for one specific day */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'entity_type' => 'required|in:brand,competitor',
            'competitor_id' => 'nullable|exists:competitors,id',
            'entity_name' => 'required|string|max:255',
            'entity_url' => 'nullable|string|max:255',
            'date' => 'required|date',
            'visibility' => 'required|numeric|min:0|max:100',
            'override_reason' => 'nullable|string|max:1000',
        ]);

        // Find the existing stat row for this date/entity
        $stat = BrandCompetitiveStat::where('brand_id', $validated['brand_id'])
            ->where('entity_type', $validated['entity_type'])
            ->where('competitor_id', $validated['competitor_id'] ?? null)
            ->whereDate('analyzed_at', $validated['date'])
            ->first();

        if ($stat) {
            // Update existing row with override values
            $stat->update([
                'visibility_override' => $validated['visibility'],
                'override_reason' => $validated['override_reason'] ?? null,
                'overridden_by' => Auth::id(),
                'overridden_at' => now(),
            ]);
        } else {
            // No AI stat exists for this date — create a new row with override
            BrandCompetitiveStat::create([
                'brand_id' => $validated['brand_id'],
                'entity_type' => $validated['entity_type'],
                'competitor_id' => $validated['competitor_id'] ?? null,
                'entity_name' => $validated['entity_name'],
                'entity_url' => $validated['entity_url'] ?? null,
                'visibility' => 0, // No AI value
                'visibility_override' => $validated['visibility'],
                'sentiment' => null,
                'position' => 5.0,
                'raw_data' => ['source' => 'manual_override_only'],
                'override_reason' => $validated['override_reason'] ?? null,
                'overridden_by' => Auth::id(),
                'overridden_at' => now(),
                'analyzed_at' => Carbon::parse($validated['date'])->setTime(12, 0, 0),
            ]);
        }

        return response()->json(['success' => true]);
    }

    /** Remove override(s) — specific date or all for an entity */
    public function reset(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'entity_type' => 'required|in:brand,competitor',
            'competitor_id' => 'nullable|exists:competitors,id',
            'date' => 'nullable|date',
        ]);

        $query = BrandCompetitiveStat::where('brand_id', $validated['brand_id'])
            ->where('entity_type', $validated['entity_type'])
            ->where('competitor_id', $validated['competitor_id'] ?? null);

        if (! empty($validated['date'])) {
            $query->whereDate('analyzed_at', $validated['date']);
        }

        // Clear the override columns (set them to null)
        $query->update([
            'visibility_override' => null,
            'override_reason' => null,
            'overridden_by' => null,
            'overridden_at' => null,
        ]);

        return response()->json(['success' => true]);
    }
}
