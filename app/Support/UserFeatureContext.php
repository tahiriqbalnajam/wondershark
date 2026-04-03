<?php

namespace App\Support;

use App\Enums\Feature;
use App\Exceptions\FeatureLimitExceededException;
use App\Models\FeatureUsage;
use App\Models\PlanFeature;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class UserFeatureContext
{
    private string $resolvedPlan;

    public function __construct(private User $user)
    {
        $this->resolvedPlan = $this->resolvePlan();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Check if the user can use a feature (optionally scoped to an entity).
     *
     * feature()->for($user)->can(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function can(string $featureKey, ?Model $entity = null): bool
    {
        if ($this->user->hasRole('admin')) {
            return true;
        }

        $limit = $this->getLimit($featureKey);

        // '0' = explicitly disabled
        if ($limit === 0) {
            return false;
        }

        // null = unlimited
        if ($limit === null) {
            return true;
        }

        $used = $this->getUsed($featureKey, $entity);

        return $used < $limit;
    }

    /**
     * Returns remaining quota, or null if unlimited, or 0 if disabled.
     *
     * feature()->for($user)->remaining(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function remaining(string $featureKey, ?Model $entity = null): int|null
    {
        if ($this->user->hasRole('admin')) {
            return null; // unlimited for admin
        }

        $limit = $this->getLimit($featureKey);

        if ($limit === 0) {
            return 0;
        }

        if ($limit === null) {
            return null; // unlimited
        }

        $used = $this->getUsed($featureKey, $entity);

        return max(0, $limit - $used);
    }

    /**
     * Record usage of a feature. Does NOT check limit first.
     * Use incrementOrFail() if you want the limit check.
     *
     * feature()->for($user)->increment(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function increment(string $featureKey, ?Model $entity = null): void
    {
        [$entityType, $entityId, $period] = $this->entityMeta($featureKey, $entity);

        FeatureUsage::incrementUsage($this->user->id, $featureKey, $period, $entityType, $entityId);
    }

    /**
     * Decrement usage (e.g. when deleting a competitor).
     *
     * feature()->for($user)->decrement(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function decrement(string $featureKey, ?Model $entity = null): void
    {
        [$entityType, $entityId, $period] = $this->entityMeta($featureKey, $entity);

        FeatureUsage::decrementUsage($this->user->id, $featureKey, $period, $entityType, $entityId);
    }

    /**
     * Check limit AND increment in one call. Throws if limit exceeded.
     * Use this in controllers instead of manual can() + increment() pairs.
     *
     * feature()->for($user)->incrementOrFail(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function incrementOrFail(string $featureKey, ?Model $entity = null): void
    {
        if (! $this->can($featureKey, $entity)) {
            $limit = $this->getLimit($featureKey);
            $used  = $this->getUsed($featureKey, $entity);
            throw new FeatureLimitExceededException($featureKey, $limit, $used);
        }

        $this->increment($featureKey, $entity);
    }

    /**
     * Get current usage count.
     *
     * feature()->for($user)->used(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function used(string $featureKey, ?Model $entity = null): int
    {
        return $this->getUsed($featureKey, $entity);
    }

    /**
     * Get the raw limit value for the user's current plan.
     * Returns null for unlimited, 0 for disabled, int for numeric limit.
     */
    public function limit(string $featureKey): int|null
    {
        return $this->getLimit($featureKey);
    }

    /**
     * Get the resolved plan name for the user.
     */
    public function plan(): string
    {
        return $this->resolvedPlan;
    }

    /**
     * Return a summary array for all features — useful for frontend.
     *
     * feature()->for($user)->summary($brand)
     * → ['competitor_analysis' => ['limit' => 5, 'used' => 2, 'remaining' => 3], ...]
     */
    public function summary(?Model $entity = null): array
    {
        $result = [];

        foreach (Feature::allKeys() as $key) {
            $limit     = $this->getLimit($key);
            $used      = $limit === null ? $this->getUsed($key, $entity) : $this->getUsed($key, $entity);
            $remaining = $limit === null ? null : ($limit === 0 ? 0 : max(0, $limit - $used));

            $result[$key] = [
                'limit'     => $limit,
                'used'      => $used,
                'remaining' => $remaining,
                'can'       => $this->can($key, $entity),
            ];
        }

        return $result;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Resolve the user's current active plan name.
     */
    private function resolvePlan(): string
    {
        // Check for active subscription
        $subscription = \App\Models\Subscription::where('user_id', $this->user->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        if ($subscription) {
            return $subscription->plan_name;
        }

        // Check for active trial (within 7 days of claim)
        if ($this->user->free_trial_availed && $this->user->free_trial_claimed_at) {
            if ($this->user->free_trial_claimed_at->addDays(7)->isFuture()) {
                return Feature::PLAN_TRIAL;
            }
        }

        return Feature::PLAN_FREE;
    }

    /**
     * Get the numeric limit for a feature on the resolved plan.
     * Returns null for unlimited, 0 for disabled.
     */
    private function getLimit(string $featureKey): int|null
    {
        $raw = PlanFeature::getValue($this->resolvedPlan, $featureKey);

        if ($raw === null) {
            return null; // unlimited
        }

        return (int) $raw; // '0' → 0 (disabled), '5' → 5
    }

    /**
     * Get current usage for a feature, optionally scoped to an entity.
     */
    private function getUsed(string $featureKey, ?Model $entity): int
    {
        [$entityType, $entityId, $period] = $this->entityMeta($featureKey, $entity);

        return FeatureUsage::getCount($this->user->id, $featureKey, $period, $entityType, $entityId);
    }

    /**
     * Determine entity type/id and period for a feature.
     * Per-entity features (like competitor_analysis) scope usage to a brand.
     * Others scope to the user level for the current month or lifetime.
     */
    private function entityMeta(string $featureKey, ?Model $entity): array
    {
        $perEntityFeatures = [
            Feature::COMPETITOR_ANALYSIS,
            Feature::POSTS_TRACKING,
        ];

        if ($entity && in_array($featureKey, $perEntityFeatures)) {
            $entityType = class_basename($entity);
            $entityId   = $entity->getKey();
            $period     = Feature::PERIOD_LIFETIME; // per-entity limits are lifetime counts
        } else {
            $entityType = null;
            $entityId   = null;
            $period     = Feature::PERIOD_LIFETIME;
        }

        return [$entityType, $entityId, $period];
    }
}
