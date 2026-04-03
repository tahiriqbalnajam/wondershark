<?php

use App\Services\FeatureService;

if (! function_exists('feature')) {
    /**
     * Get the FeatureService instance.
     *
     * Usage:
     *   feature()->for($user)->can('competitor_analysis', $brand)
     *   feature()->for($user)->remaining('brands_covered')
     *   feature()->for($user)->incrementOrFail('competitor_analysis', $brand)
     *   feature()->plan()  // current user's plan
     */
    function feature(): FeatureService
    {
        return app(FeatureService::class);
    }
}
