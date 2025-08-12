<?php

namespace App\Http\Controllers\Agency;

use App\Http\Controllers\Controller;
use App\Models\AgencyMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PeopleController extends Controller
{
    /**
     * Display a listing of agency members.
     */
    public function index(): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        $members = AgencyMember::where('agency_id', $user->id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('agency/people/index', [
            'members' => $members,
        ]);
    }

    /**
     * Store a new agency member.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:agency_member',
            'rights' => 'array',
        ]);

        DB::transaction(function () use ($request) {
            /** @var User $agency */
            $agency = Auth::user();

            // Create the user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(),
            ]);

            // Assign the agency_member role
            $user->assignRole('agency_member');

            // Create agency member relationship
            AgencyMember::create([
                'user_id' => $user->id,
                'agency_id' => $agency->id,
                'role' => $request->role,
                'rights' => $request->rights ?? [],
            ]);
        });

        return redirect()->route('agency.people.index')->with('success', 'Agency member added successfully!');
    }

    /**
     * Update agency member rights.
     */
    public function updateRights(Request $request, AgencyMember $member): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the member belongs to the authenticated agency
        if ($member->agency_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'rights' => 'array',
        ]);

        $member->update([
            'rights' => $request->rights ?? [],
        ]);

        return back()->with('success', 'Member rights updated successfully!');
    }

    /**
     * Remove agency member.
     */
    public function destroy(AgencyMember $member): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the member belongs to the authenticated agency
        if ($member->agency_id !== $user->id) {
            abort(403);
        }

        DB::transaction(function () use ($member) {
            // Remove the user account
            $member->user->delete();
            
            // Remove the agency member relationship
            $member->delete();
        });

        return redirect()->route('agency.people.index')->with('success', 'Agency member removed successfully!');
    }
}
