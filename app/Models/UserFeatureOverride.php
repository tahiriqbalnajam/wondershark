<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeatureOverride extends Model
{
    protected $fillable = ['user_id', 'feature_key', 'value'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all overrides for a user keyed by feature_key.
     */
    public static function forUser(int $userId): array
    {
        return static::where('user_id', $userId)
            ->pluck('value', 'feature_key')
            ->toArray();
    }

    /**
     * Resolve the effective value for a feature for a given user.
     * Priority: user override → plan feature → disabled ('0').
     */
    public static function resolve(User $user, string $featureKey): string|null
    {
        // 1. User-level override
        $override = static::where('user_id', $user->id)
            ->where('feature_key', $featureKey)
            ->first();

        if ($override !== null) {
            return $override->value;
        }

        // 2. Plan-level default (active subscription or trial plan)
        $planName = $user->activePlanName();
        if ($planName) {
            return PlanFeature::getValue($planName, $featureKey);
        }

        return '0'; // no plan, no override = disabled
    }
}
