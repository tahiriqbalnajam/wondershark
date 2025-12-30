<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class AgencyController extends Controller
{
    /**
     * Display a listing of agencies.
     */
    public function index()
    {
        $agencies = User::role('agency')
            ->with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($agency) {
                return [
                    'id' => $agency->id,
                    'name' => $agency->name,
                    'email' => $agency->email,
                    'created_at' => $agency->created_at->format('Y-m-d H:i:s'),
                    'brands_count' => $agency->brands()->count(),
                ];
            });

        return Inertia::render('admin/agencies/index', [
            'agencies' => $agencies,
        ]);
    }

    /**
     * Show the form for creating a new agency.
     */
    public function create()
    {
        return Inertia::render('admin/agencies/create');
    }

    /**
     * Store a newly created agency in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Assign agency role
        $user->assignRole('agency');

        return redirect()->route('admin.agencies.index')
            ->with('success', 'Agency created successfully.');
    }

    /**
     * Show the form for editing the specified agency.
     */
    public function edit(User $agency)
    {
        // Verify the user is actually an agency
        if (! $agency->hasRole('agency')) {
            return redirect()->route('admin.agencies.index')
                ->with('error', 'User is not an agency.');
        }

        return Inertia::render('admin/agencies/edit', [
            'agency' => [
                'id' => $agency->id,
                'name' => $agency->name,
                'email' => $agency->email,
            ],
        ]);
    }

    /**
     * Update the specified agency in storage.
     */
    public function update(Request $request, User $agency)
    {
        // Verify the user is actually an agency
        if (! $agency->hasRole('agency')) {
            return redirect()->route('admin.agencies.index')
                ->with('error', 'User is not an agency.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email,'.$agency->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);

        $agency->name = $request->name;
        $agency->email = $request->email;

        // Only update password if provided
        if ($request->filled('password')) {
            $agency->password = Hash::make($request->password);
        }

        $agency->save();

        return redirect()->route('admin.agencies.index')
            ->with('success', 'Agency updated successfully.');
    }

    /**
     * Remove the specified agency from storage.
     */
    public function destroy(User $agency)
    {
        // Verify the user is actually an agency
        if (! $agency->hasRole('agency')) {
            return redirect()->route('admin.agencies.index')
                ->with('error', 'User is not an agency.');
        }

        $agency->delete();

        return redirect()->route('admin.agencies.index')
            ->with('success', 'Agency deleted successfully.');
    }
}
