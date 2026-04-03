<?php

namespace App\Services;

use App\Models\User;
use App\Support\UserFeatureContext;

class FeatureService
{
    /**
     * Get a fluent feature context for a specific user.
     *
     * feature()->for($user)->can(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function for(User $user): UserFeatureContext
    {
        return new UserFeatureContext($user);
    }

    /**
     * Shortcut for the currently authenticated user.
     *
     * feature()->can(Feature::COMPETITOR_ANALYSIS, $brand)
     */
    public function can(string $featureKey, $entity = null): bool
    {
        return $this->forAuth()->can($featureKey, $entity);
    }

    public function remaining(string $featureKey, $entity = null): int|null
    {
        return $this->forAuth()->remaining($featureKey, $entity);
    }

    public function increment(string $featureKey, $entity = null): void
    {
        $this->forAuth()->increment($featureKey, $entity);
    }

    public function incrementOrFail(string $featureKey, $entity = null): void
    {
        $this->forAuth()->incrementOrFail($featureKey, $entity);
    }

    public function decrement(string $featureKey, $entity = null): void
    {
        $this->forAuth()->decrement($featureKey, $entity);
    }

    public function plan(): string
    {
        return $this->forAuth()->plan();
    }

    public function summary($entity = null): array
    {
        return $this->forAuth()->summary($entity);
    }

    private function forAuth(): UserFeatureContext
    {
        /** @var User $user */
        $user = auth()->user();

        if (! $user) {
            throw new \RuntimeException('No authenticated user. Use feature()->for($user) instead.');
        }

        return $this->for($user);
    }
}
