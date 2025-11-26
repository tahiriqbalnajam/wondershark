<?php

namespace App\Http\Controllers\Agency;

use App\Http\Controllers\Controller;
use App\Models\AgencyMember;
use App\Models\AgencyInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
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

        // Get pending invitations
        $pendingInvitations = AgencyInvitation::where('agency_id', $user->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('agency/people/index', [
            'members' => $members,
            'pendingInvitations' => $pendingInvitations,
        ]);
    }

    /**
     * Send an invitation to join the agency.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'role' => 'nullable|string|in:agency_member',
            'rights' => 'nullable|array',
        ]);

        /** @var User $agency */
        $agency = Auth::user();

        // Check if email is already a user
        $existingUser = User::where('email', $request->email)->first();
        if ($existingUser) {
            return back()->withErrors(['email' => 'This email is already registered in the system.']);
        }

        // Check if there's already a pending invitation for this email
        $existingInvitation = AgencyInvitation::where('agency_id', $agency->id)
            ->where('email', $request->email)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($existingInvitation) {
            return back()->withErrors(['email' => 'An invitation has already been sent to this email address.']);
        }

        // Create the invitation
        $invitation = AgencyInvitation::create([
            'agency_id' => $agency->id,
            'name' => $request->name,
            'email' => $request->email,
            'token' => AgencyInvitation::generateToken(),
            'role' => $request->role ?? 'agency_member',
            'rights' => $request->rights ?? [],
            'expires_at' => now()->addHours(48),
        ]);

        // Generate invitation URL
        $invitationUrl = route('agency.invitation.accept', ['token' => $invitation->token]);

        // Send invitation email
        try {
            Mail::to($invitation->email)->send(
                new \App\Mail\AgencyInvitation($invitation, $invitationUrl)
            );
        } catch (\Exception $e) {
            // Log the error but don't fail the invitation creation
            Log::error('Failed to send invitation email', [
                'invitation_id' => $invitation->id,
                'email' => $invitation->email,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->route('agency.people.index')
                ->with('warning', 'Invitation created but email could not be sent. Please check your email configuration.');
        }

        return redirect()->route('agency.people.index')
            ->with('success', 'Invitation sent successfully to ' . $invitation->email);
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
