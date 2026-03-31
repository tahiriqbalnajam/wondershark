<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Agency\SubscriptionController;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SyncSubscriptionStatus
{
    /**
     * Handle an incoming request.
     * Syncs subscription status with Stripe before processing the request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // If user is an agency member, get the agency owner
            if ($user->hasRole('agency_member')) {
                $agencyId = $user->agencyMembership?->agency_id;
                if ($agencyId) {
                    $user = \App\Models\User::find($agencyId);
                }
            }
            
            // Sync subscription status with Stripe
            \Log::info('SyncSubscriptionStatus middleware running', ['user_id' => $user->id]);
            $subscriptionController = app(SubscriptionController::class);
            $subscription = $subscriptionController->syncSubscriptionStatus($user->id);
            \Log::info('Subscription synced', [
                'user_id' => $user->id,
                'has_subscription' => $subscription ? 'yes' : 'no',
                'cancel_at_period_end' => $subscription?->cancel_at_period_end ?? 'N/A',
            ]);
        }
        
        return $next($request);
    }
}
