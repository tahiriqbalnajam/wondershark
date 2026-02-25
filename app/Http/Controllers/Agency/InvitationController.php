<?php

namespace App\Http\Controllers\Agency;

use App\Http\Controllers\Controller;
use App\Models\AgencyInvitation;
use App\Models\AgencyMember;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    /**
     * Show the invitation acceptance page
     */
    public function show(string $token): Response|RedirectResponse
    {
        $invitation = AgencyInvitation::where('token', $token)->first();

        if (! $invitation) {
            return redirect()->route('login')->with('error', 'Invalid invitation link.');
        }

        if ($invitation->isExpired()) {
            return redirect()->route('login')->with('error', 'This invitation has expired.');
        }

        if ($invitation->isAccepted()) {
            return redirect()->route('login')->with('info', 'This invitation has already been accepted.');
        }

        return Inertia::render('agency/invitation/accept', [
            'invitation' => [
                'token' => $invitation->token,
                'name' => $invitation->name,
                'email' => $invitation->email,
                'agency_name' => $invitation->agency->name,
                'expires_at' => $invitation->expires_at->format('M d, Y g:i A'),
            ],
        ]);
    }

    /**
     * Accept the invitation and create the user account
     */
    public function accept(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $invitation = AgencyInvitation::where('token', $request->token)->first();

        if (! $invitation) {
            return redirect()->route('login')->with('error', 'Invalid invitation link.');
        }

        if ($invitation->isExpired()) {
            return redirect()->route('login')->with('error', 'This invitation has expired.');
        }

        if ($invitation->isAccepted()) {
            return redirect()->route('login')->with('info', 'This invitation has already been accepted.');
        }

        // Check if email is now taken (race condition check)
        $existingUser = User::where('email', $invitation->email)->first();
        if ($existingUser) {
            return redirect()->route('login')->with('error', 'This email is already registered.');
        }

        DB::transaction(function () use ($invitation, $request) {
            // Create the user
            $user = User::create([
                'name' => $invitation->name,
                'email' => $invitation->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(),
            ]);

            // Assign the agency_member role
            $user->assignRole($invitation->role);

            // Create agency member relationship
            AgencyMember::create([
                'user_id' => $user->id,
                'agency_id' => $invitation->agency_id,
                'role' => $invitation->role,
                'rights' => $invitation->rights ?? [],
            ]);

            // Mark invitation as accepted
            $invitation->markAsAccepted($user);

            // Log the user in
            Auth::login($user);
        });

        return redirect()->route('dashboard')->with('success', 'Welcome to WonderShark! Your account has been created successfully.');
    }

    /**
     * Resend an invitation
     */
    public function resend(AgencyInvitation $invitation): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        // Ensure the invitation belongs to the authenticated agency
        if ($invitation->agency_id !== $user->id) {
            abort(403);
        }

        if ($invitation->isAccepted()) {
            return back()->with('error', 'This invitation has already been accepted.');
        }

        // Update expiration time
        $invitation->update([
            'expires_at' => now()->addHours(48),
        ]);

        // Generate invitation URL
        $invitationUrl = route('agency.invitation.accept', ['token' => $invitation->token]);

        // Resend invitation email
        try {
            \Mail::to($invitation->email)->send(
                new \App\Mail\AgencyInvitation($invitation, $invitationUrl)
            );
        } catch (\Exception $e) {
            \Log::error('Failed to resend invitation email', [
                'invitation_id' => $invitation->id,
                'email' => $invitation->email,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Failed to send invitation email. Please check your email configuration.');
        }

        return back()->with('success', 'Invitation resent to '.$invitation->email);
    }

    /**
     * Cancel/delete an invitation
     */
    public function destroy(AgencyInvitation $invitation): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();



        // Ensure the invitation belongs to the authenticated agency
        if( $user->hasRole('agency_member')) {
        }
        else if ($invitation->agency_id !== $user->id) {
            abort(403);
        }

        if ($invitation->isAccepted()) {
            return back()->with('error', 'Cannot delete an accepted invitation.');
        }

        $email = $invitation->email;
        $invitation->delete();

        return back()->with('success', 'Invitation to '.$email.' has been cancelled.');
    }
}
