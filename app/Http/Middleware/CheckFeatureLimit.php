<?php

namespace App\Http\Middleware;

use App\Exceptions\FeatureLimitExceededException;
use Closure;
use Illuminate\Http\Request;

class CheckFeatureLimit
{
    /**
     * Usage on routes:
     *   ->middleware('feature:competitor_analysis')
     *   ->middleware('feature:competitor_analysis,brand')   // brand = route param name
     *
     * The second argument is the name of a route parameter that resolves
     * to an Eloquent model (via route model binding). If omitted, no entity scoping.
     */
    public function handle(Request $request, Closure $next, string $featureKey, ?string $entityParam = null): mixed
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $user || $user->hasRole('admin')) {
            return $next($request);
        }

        $entity = $entityParam ? $request->route($entityParam) : null;

        if (! feature()->for($user)->can($featureKey, $entity)) {
            $limit = feature()->for($user)->limit($featureKey);
            $used  = feature()->for($user)->used($featureKey, $entity);
            throw new FeatureLimitExceededException($featureKey, $limit, $used);
        }

        return $next($request);
    }
}
