<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlanFeature extends Model
{
    protected $fillable = ['plan_name', 'feature_key', 'value'];

    /**
     * Load all features for a plan, cached for 1 hour.
     * Returns: ['feature_key' => value_or_null, ...]
     * null  = unlimited
     * '0'   = disabled
     * '5'   = limit of 5
     */
    public static function forPlan(string $planName): array
    {
        return Cache::remember("plan_features:{$planName}", 3600, function () use ($planName) {
            return static::where('plan_name', $planName)
                ->pluck('value', 'feature_key')
                ->toArray();
        });
    }

    /**
     * Get a single feature value for a plan.
     */
    public static function getValue(string $planName, string $featureKey): string|null
    {
        $features = static::forPlan($planName);
        // Feature not defined for plan = disabled
        return array_key_exists($featureKey, $features) ? $features[$featureKey] : '0';
    }

    /**
     * Call after updating plan_features table to clear cache.
     */
    public static function clearCache(string $planName): void
    {
        Cache::forget("plan_features:{$planName}");
    }

    public static function clearAllCache(): void
    {
        foreach (['trial', 'agency_growth', 'agency_unlimited', 'free', 'brand_growth'] as $plan) {
            Cache::forget("plan_features:{$plan}");
        }
    }
}
