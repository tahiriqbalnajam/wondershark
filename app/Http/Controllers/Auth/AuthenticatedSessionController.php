<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();
        $request->session()->put('logged_in_at', now()->timestamp);

        $user = Auth::user();

        // Redirect trial users to billing page if they don't have an active subscription
        if ($user && !$user->activeSubscription) {
            // Option B: Immediate paywall - redirect to billing
            if ($user->trial_type === 'B') {
                if ($user->hasRole('agency')) {
                    return redirect()->route('agency.billing');
                } elseif ($user->hasRole('brand')) {
                    return redirect()->route('brand.billing');
                }
                return redirect()->route('agency.billing');
            }
            
            // Option A: Free trial - redirect to billing to show discount
            if ($user->trial_type === 'A' && $user->isOnTrial() && $user->trialDaysLeft() <= 4) {
                if ($user->hasRole('agency')) {
                    return redirect()->route('agency.billing');
                } elseif ($user->hasRole('brand')) {
                    return redirect()->route('brand.billing');
                }
                return redirect()->route('agency.billing');
            }


            if ($user->trial_type === 'A' && $user->isTrialExpired() && !$user->activeSubscription) {
                if ($user->hasRole('agency')) {
                    return redirect()->route('agency.billing');
                } elseif ($user->hasRole('brand')) {
                    return redirect()->route('brand.billing');
                }
                return redirect()->route('agency.billing');
            }
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
