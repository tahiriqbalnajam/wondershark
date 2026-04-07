<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlanFeature;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlanFeatureController extends Controller
{
    const PLANS = ['trial', 'free', 'agency_growth', 'agency_unlimited'];

    const FEATURE_KEYS = [
        'brands_covered',
        'competitor_analysis',
        'monthly_posts',
        'ai_models_access',
        'search_analytics',
        'docs_files',
        'agency_members',
        'brand_users',
        'api_access',
        'white_label',
        'priority_support',
    ];

    public function index()
    {
        $rows = PlanFeature::all();

        // Build a map: feature_key => [plan_name => value]
        $features = [];
        foreach (self::FEATURE_KEYS as $key) {
            $features[$key] = [];
            foreach (self::PLANS as $plan) {
                $features[$key][$plan] = null; // default: not set
            }
        }

        foreach ($rows as $row) {
            if (isset($features[$row->feature_key])) {
                $features[$row->feature_key][$row->plan_name] = $row->value;
            }
        }

        return Inertia::render('admin/plan-features/index', [
            'plans' => self::PLANS,
            'featureKeys' => self::FEATURE_KEYS,
            'features' => $features,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'features' => 'required|array',
            'features.*.plan_name' => 'required|string|in:' . implode(',', self::PLANS),
            'features.*.feature_key' => 'required|string|in:' . implode(',', self::FEATURE_KEYS),
            'features.*.value' => 'nullable|string|max:255',
        ]);

        foreach ($request->features as $item) {
            PlanFeature::updateOrCreate(
                [
                    'plan_name' => $item['plan_name'],
                    'feature_key' => $item['feature_key'],
                ],
                ['value' => $item['value']]
            );
        }

        PlanFeature::clearAllCache();

        return back()->with('success', 'Plan features updated successfully.');
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'plan_name' => 'required|string|in:' . implode(',', self::PLANS),
            'feature_key' => 'required|string|in:' . implode(',', self::FEATURE_KEYS),
        ]);

        PlanFeature::where('plan_name', $request->plan_name)
            ->where('feature_key', $request->feature_key)
            ->delete();

        PlanFeature::clearAllCache();

        return back()->with('success', 'Feature removed.');
    }
}
