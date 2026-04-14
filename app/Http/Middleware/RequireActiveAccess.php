<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RequireActiveAccess
{
    /**
     * Routes (by name) that are always accessible regardless of subscription/trial status.
     * Billing pages, subscription actions, auth routes, and webhooks are excluded.
     */
    protected array $excluded = [
        'agency.billing',
        'brand.billing',
        'subscriptions.subscribe',
        'subscriptions.subscribe-with-card',
        'subscriptions.success',
        'subscriptions.update',
        'subscriptions.cancel',
        'subscriptions.reactivate',
        'subscriptions.status',
        'subscriptions.billing-portal',
        'subscriptions.setup-intent',
        'subscriptions.attach-payment-method',
        'subscriptions.payment-methods',
        'agency.subscriptions.subscribe',
        'agency.subscriptions.subscribe-with-card',
        'agency.subscriptions.success',
        'agency.subscriptions.update',
        'agency.subscriptions.cancel',
        'agency.subscriptions.reactivate',
        'agency.subscriptions.status',
        'agency.subscriptions.billing-portal',
        'agency.subscriptions.setup-intent',
        'agency.subscriptions.attach-payment-method',
        'agency.subscriptions.payment-methods',
        'brand.subscriptions.subscribe',
        'brand.subscriptions.subscribe-with-card',
        'brand.subscriptions.success',
        'brand.subscriptions.update',
        'brand.subscriptions.cancel',
        'brand.subscriptions.reactivate',
        'brand.subscriptions.status',
        'brand.subscriptions.billing-portal',
        'brand.subscriptions.setup-intent',
        'brand.subscriptions.attach-payment-method',
        'brand.subscriptions.payment-methods',
        'stripe.webhook',
        'login',
        'logout',
        'register',
        'password.request',
        'password.reset',
        'verification.notice',
        'verification.verify',
        'verification.send',
        'agency.invitation.accept',
        'agency.invitation.store',
        'home',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return $next($request);
        }

        $user = Auth::user();

        // Admins always have access
        if ($user->hasRole('admin')) {
            return $next($request);
        }

        // Skip excluded routes
        $routeName = $request->route()?->getName();
        if ($routeName && in_array($routeName, $this->excluded)) {
            return $next($request);
        }

        // For agency members, check the agency owner's subscription/trial
        $accountUser = $user;
        if ($user->hasRole('agency_member')) {
            $agencyId = $user->agencyMembership?->agency_id;
            if ($agencyId) {
                $accountUser = \App\Models\User::find($agencyId) ?? $user;
            }
        }

        // Allow access if active trial or active subscription exists
        if ($accountUser->isOnTrial() || $accountUser->activeSubscription) {
            return $next($request);
        }

        // No access — redirect to the appropriate billing page
        if ($request->expectsJson()) {
            return response()->json(['message' => 'Subscription required.'], 402);
        }

        $billingRoute = $this->billingRoute($accountUser);

        return redirect()->route($billingRoute)
            ->with('warning', 'Please subscribe to access this feature.');
    }

    private function billingRoute(\App\Models\User $user): string
    {
        if ($user->hasRole('agency') || $user->hasRole('agency_member')) {
            return 'agency.billing';
        }

        if ($user->hasRole('brand')) {
            return 'brand.billing';
        }

        // Fallback
        return 'agency.billing';
    }
}
