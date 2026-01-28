<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MagicLinkController extends Controller
{
    /**
     * Send a magic link to the user's email.
     */
    public function sendMagicLink(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $this->ensureIsNotRateLimited($request);

        // Find user by email
        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'No account found with this email address.',
            ]);
        }

        // Generate signed URL that expires in 15 minutes
        $magicLinkUrl = URL::temporarySignedRoute(
            'magic-link.verify',
            now()->addMinutes(15),
            ['user' => $user->id]
        );

        // Send email with magic link
        Mail::send('emails.magic-link', ['url' => $magicLinkUrl, 'user' => $user], function ($message) use ($user) {
            $message->to($user->email)
                ->subject('Your Magic Login Link');
        });

        RateLimiter::hit($this->throttleKey($request));

        return back()->with('status', 'Magic link sent! Check your email.');
    }

    /**
     * Verify the magic link and log the user in.
     */
    public function verifyMagicLink(Request $request, User $user): RedirectResponse
    {
        // The signed middleware already validates the signature and expiration

        // Log the user in
        Auth::login($user, true); // true = remember me

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Ensure the request is not rate limited.
     */
    protected function ensureIsNotRateLimited(Request $request): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey($request), 3)) {
            return;
        }

        event(new Lockout($request));

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    protected function throttleKey(Request $request): string
    {
        return Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());
    }
}
