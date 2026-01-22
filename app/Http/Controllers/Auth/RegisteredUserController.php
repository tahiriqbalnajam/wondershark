<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // Validate base fields
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|string|in:admin,agency,brand',
            'website' => 'required_if:role,brand|nullable|url|max:255',
            'country' => 'required_if:role,brand|nullable|string|max:2',
        ]);

        try {
            \DB::beginTransaction();

            // Create the user account
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            // Assign the selected role to the user
            $user->assignRole($validated['role']);

            // If the user is registering as a brand, create a brand record
            if ($validated['role'] === 'brand') {
                \App\Models\Brand::create([
                    'agency_id' => null, // Individual brand signup, no agency
                    'user_id' => $user->id,
                    'name' => $validated['name'],
                    'website' => $validated['website'],
                    'country' => $validated['country'],
                    'status' => 'active',
                ]);
            }

            \DB::commit();

            event(new Registered($user));

            Auth::login($user);

            return redirect()->intended(route('dashboard', absolute: false));
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Failed to register user: '.$e->getMessage());

            return redirect()->back()->withErrors(['error' => 'Failed to create account. Please try again.']);
        }
    }
}
